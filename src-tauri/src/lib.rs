use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::time::Instant;
use tauri::Manager;
use walkdir::WalkDir;

mod user_agent;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiscoveredSpec {
    id: String,
    path: String,
    name: String,
    format: String,
    modified_at: String,
    size_bytes: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HeaderPair {
    key: String,
    value: String,
    enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiRequest {
    method: String,
    url: String,
    headers: Vec<HeaderPair>,
    query_params: Option<serde_json::Value>,
    body: Option<String>,
    timeout_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    content_type: String,
    body: String,
    body_encoding: String,
    size_bytes: usize,
    duration_ms: u128,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RequestHistoryItem {
    id: String,
    endpoint_id: Option<String>,
    method: String,
    url: String,
    status: u16,
    duration_ms: u128,
    request: serde_json::Value,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct FavoriteEndpoint {
    endpoint_id: String,
    created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentVariable {
    id: String,
    environment_id: String,
    key: String,
    value: String,
    enabled: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthProfile {
    id: String,
    name: String,
    r#type: String,
    environment_id: String,
    secret_ref: String,
    enabled: bool,
    config: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct RequestTemplate {
    id: String,
    name: String,
    request: serde_json::Value,
    auth_profile_id: Option<String>,
    created_at: String,
    updated_at: String,
}

#[tauri::command]
fn discover_specs(folders: Vec<String>) -> Result<Vec<DiscoveredSpec>, String> {
    let mut specs = Vec::new();

    for folder in folders {
        for entry in WalkDir::new(folder).follow_links(false).into_iter().filter_map(Result::ok) {
            if !entry.file_type().is_file() {
                continue;
            }

            let path = entry.path();
            let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
                continue;
            };

            let format = match extension.to_ascii_lowercase().as_str() {
                "yaml" | "yml" => "yaml",
                "json" => "json",
                _ => continue,
            };

            let metadata = entry.metadata().map_err(|error| error.to_string())?;
            specs.push(DiscoveredSpec {
                id: stable_id(path),
                path: path.to_string_lossy().to_string(),
                name: path.file_name().and_then(|value| value.to_str()).unwrap_or("spec").to_string(),
                format: format.to_string(),
                modified_at: "unknown".to_string(),
                size_bytes: metadata.len(),
            });
        }
    }

    Ok(specs)
}

#[tauri::command]
async fn execute_request(request: ApiRequest) -> Result<ApiResponse, String> {
    let request = user_agent::ensure_user_agent_header(request);
    let method = request.method.parse::<reqwest::Method>().map_err(|error| error.to_string())?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(request.timeout_ms))
        .build()
        .map_err(|error| error.to_string())?;

    let mut builder = client.request(method, request.url);
    for header in request.headers.iter().filter(|header| header.enabled) {
        builder = builder.header(&header.key, &header.value);
    }

    if let Some(body) = request.body {
        if !body.is_empty() {
            builder = builder.body(body);
        }
    }

    let started = Instant::now();
    let response = builder.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let headers: HashMap<String, String> = response
        .headers()
        .iter()
        .filter_map(|(key, value)| value.to_str().ok().map(|value| (key.as_str().to_ascii_lowercase(), value.to_string())))
        .collect();
    let content_type = headers.get("content-type").cloned().unwrap_or_else(|| "application/octet-stream".to_string());
    let bytes = response.bytes().await.map_err(|error| error.to_string())?;
    let is_textual = is_textual_content_type(&content_type);
    let body = if is_textual {
        String::from_utf8_lossy(&bytes).to_string()
    } else {
        STANDARD.encode(&bytes)
    };

    Ok(ApiResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers,
        content_type,
        body,
        body_encoding: if is_textual { "text".to_string() } else { "base64".to_string() },
        size_bytes: bytes.len(),
        duration_ms: started.elapsed().as_millis(),
    })
}

#[tauri::command]
fn save_response_body(path: String, body: String, body_encoding: String) -> Result<(), String> {
    let bytes = if body_encoding == "base64" {
        STANDARD.decode(body).map_err(|error| error.to_string())?
    } else {
        body.into_bytes()
    };
    std::fs::write(path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_history(app: tauri::AppHandle) -> Result<Vec<RequestHistoryItem>, String> {
    let connection = open_database(&app)?;
    let mut statement = connection
        .prepare(
            "
            select id, endpoint_id, method, url, status, duration_ms, request_json, created_at
            from request_history
            order by created_at desc
            limit 50
            ",
        )
        .map_err(|error| error.to_string())?;

    let rows = statement
        .query_map([], |row| {
            let request_json: String = row.get(6)?;
            Ok(RequestHistoryItem {
                id: row.get(0)?,
                endpoint_id: row.get(1)?,
                method: row.get(2)?,
                url: row.get(3)?,
                status: row.get::<_, i64>(4)? as u16,
                duration_ms: row.get::<_, i64>(5)? as u128,
                request: serde_json::from_str(&request_json).unwrap_or(serde_json::Value::Null),
                created_at: row.get(7)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_history_item(app: tauri::AppHandle, item: RequestHistoryItem) -> Result<(), String> {
    let connection = open_database(&app)?;
    connection
        .execute(
            "
            insert into request_history (id, endpoint_id, method, url, status, duration_ms, request_json, created_at)
            values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ",
            params![
                item.id,
                item.endpoint_id,
                item.method,
                item.url,
                item.status as i64,
                item.duration_ms as i64,
                serde_json::to_string(&item.request).map_err(|error| error.to_string())?,
                item.created_at
            ],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn clear_history(app: tauri::AppHandle) -> Result<(), String> {
    let connection = open_database(&app)?;
    connection.execute("delete from request_history", []).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn list_favorites(app: tauri::AppHandle) -> Result<Vec<FavoriteEndpoint>, String> {
    let connection = open_database(&app)?;
    read_favorites(&connection)
}

#[tauri::command]
fn toggle_favorite(app: tauri::AppHandle, endpoint_id: String) -> Result<Vec<FavoriteEndpoint>, String> {
    let connection = open_database(&app)?;
    let exists: i64 = connection
        .query_row("select count(*) from favorites where endpoint_id = ?1", params![endpoint_id], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    if exists > 0 {
        connection
            .execute("delete from favorites where endpoint_id = ?1", params![endpoint_id])
            .map_err(|error| error.to_string())?;
    } else {
        connection
            .execute(
                "insert into favorites (endpoint_id, created_at) values (?1, datetime('now'))",
                params![endpoint_id],
            )
            .map_err(|error| error.to_string())?;
    }

    read_favorites(&connection)
}

#[tauri::command]
fn list_variables(app: tauri::AppHandle) -> Result<Vec<EnvironmentVariable>, String> {
    let connection = open_database(&app)?;
    seed_default_variables(&connection)?;
    read_variables(&connection)
}

#[tauri::command]
fn save_variable(app: tauri::AppHandle, variable: EnvironmentVariable) -> Result<Vec<EnvironmentVariable>, String> {
    let connection = open_database(&app)?;
    connection
        .execute(
            "
            insert into environment_variables (id, environment_id, key, value, enabled)
            values (?1, ?2, ?3, ?4, ?5)
            on conflict(id) do update set
                environment_id = excluded.environment_id,
                key = excluded.key,
                value = excluded.value,
                enabled = excluded.enabled
            ",
            params![
                variable.id,
                variable.environment_id,
                variable.key,
                variable.value,
                if variable.enabled { 1 } else { 0 }
            ],
        )
        .map_err(|error| error.to_string())?;
    read_variables(&connection)
}

#[tauri::command]
fn delete_variable(app: tauri::AppHandle, id: String) -> Result<Vec<EnvironmentVariable>, String> {
    let connection = open_database(&app)?;
    connection
        .execute("delete from environment_variables where id = ?1", params![id])
        .map_err(|error| error.to_string())?;
    read_variables(&connection)
}

#[tauri::command]
fn list_auth_profiles(app: tauri::AppHandle) -> Result<Vec<AuthProfile>, String> {
    let connection = open_database(&app)?;
    read_auth_profiles(&connection)
}

#[tauri::command]
fn save_auth_profile(app: tauri::AppHandle, profile: AuthProfile) -> Result<Vec<AuthProfile>, String> {
    let connection = open_database(&app)?;
    connection
        .execute(
            "
            insert into auth_profiles (id, name, type, environment_id, secret_ref, enabled, config_json)
            values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            on conflict(id) do update set
                name = excluded.name,
                type = excluded.type,
                environment_id = excluded.environment_id,
                secret_ref = excluded.secret_ref,
                enabled = excluded.enabled,
                config_json = excluded.config_json
            ",
            params![
                profile.id,
                profile.name,
                profile.r#type,
                profile.environment_id,
                profile.secret_ref,
                if profile.enabled { 1 } else { 0 },
                serde_json::to_string(&profile.config).map_err(|error| error.to_string())?
            ],
        )
        .map_err(|error| error.to_string())?;
    read_auth_profiles(&connection)
}

#[tauri::command]
fn delete_auth_profile(app: tauri::AppHandle, id: String) -> Result<Vec<AuthProfile>, String> {
    let connection = open_database(&app)?;
    connection.execute("delete from auth_profiles where id = ?1", params![id]).map_err(|error| error.to_string())?;
    read_auth_profiles(&connection)
}

#[tauri::command]
fn set_credential_secret(secret_ref: String, secret: String) -> Result<(), String> {
    keyring::Entry::new("rexvit-console", &secret_ref)
        .map_err(|error| error.to_string())?
        .set_password(&secret)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_credential_secret(secret_ref: String) -> Result<String, String> {
    keyring::Entry::new("rexvit-console", &secret_ref)
        .map_err(|error| error.to_string())?
        .get_password()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn list_request_templates(app: tauri::AppHandle) -> Result<Vec<RequestTemplate>, String> {
    let connection = open_database(&app)?;
    read_request_templates(&connection)
}

#[tauri::command]
fn save_request_template(app: tauri::AppHandle, template: RequestTemplate) -> Result<Vec<RequestTemplate>, String> {
    let connection = open_database(&app)?;
    connection
        .execute(
            "
            insert into request_templates (id, name, request_json, auth_profile_id, created_at, updated_at)
            values (?1, ?2, ?3, ?4, ?5, ?6)
            on conflict(id) do update set
                name = excluded.name,
                request_json = excluded.request_json,
                auth_profile_id = excluded.auth_profile_id,
                updated_at = excluded.updated_at
            ",
            params![
                template.id,
                template.name,
                serde_json::to_string(&template.request).map_err(|error| error.to_string())?,
                template.auth_profile_id,
                template.created_at,
                template.updated_at
            ],
        )
        .map_err(|error| error.to_string())?;
    read_request_templates(&connection)
}

#[tauri::command]
fn delete_request_template(app: tauri::AppHandle, id: String) -> Result<Vec<RequestTemplate>, String> {
    let connection = open_database(&app)?;
    connection.execute("delete from request_templates where id = ?1", params![id]).map_err(|error| error.to_string())?;
    read_request_templates(&connection)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_dir)?;
            init_database(&app_dir.join("rexvit.sqlite"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            discover_specs,
            execute_request,
            save_response_body,
            list_history,
            save_history_item,
            clear_history,
            list_favorites,
            toggle_favorite,
            list_variables,
            save_variable,
            delete_variable,
            list_auth_profiles,
            save_auth_profile,
            delete_auth_profile,
            set_credential_secret,
            get_credential_secret,
            list_request_templates,
            save_request_template,
            delete_request_template
        ])
        .run(tauri::generate_context!())
        .expect("error while running RexVit Console");
}

fn stable_id(path: &Path) -> String {
    path.to_string_lossy().replace(['/', '\\', ':', ' '], "_")
}

fn is_textual_content_type(content_type: &str) -> bool {
    let normalized = content_type.to_ascii_lowercase();
    normalized.starts_with("text/")
        || normalized.contains("json")
        || normalized.contains("xml")
        || normalized.contains("html")
        || normalized.contains("javascript")
}

fn init_database(path: &Path) -> rusqlite::Result<()> {
    let connection = Connection::open(path)?;
    connection.execute_batch(
        "
        create table if not exists discovered_specs (
            id text primary key,
            path text not null unique,
            name text not null,
            format text not null,
            modified_at text not null,
            size_bytes integer not null,
            indexed_at text not null default current_timestamp
        );

        create table if not exists request_history (
            id text primary key,
            endpoint_id text,
            method text not null,
            url text not null,
            status integer,
            duration_ms integer,
            request_json text not null,
            created_at text not null default current_timestamp
        );

        create table if not exists favorites (
            endpoint_id text primary key,
            created_at text not null default current_timestamp
        );

        create table if not exists environment_variables (
            id text primary key,
            environment_id text not null,
            key text not null,
            value text not null,
            enabled integer not null default 1
        );

        create table if not exists auth_profiles (
            id text primary key,
            name text not null,
            type text not null,
            environment_id text not null,
            secret_ref text not null,
            enabled integer not null default 1,
            config_json text not null
        );

        create table if not exists request_templates (
            id text primary key,
            name text not null,
            request_json text not null,
            auth_profile_id text,
            created_at text not null,
            updated_at text not null
        );
        ",
    )?;
    if !table_has_column(&connection, "request_history", "request_json")? {
        connection.execute_batch(
            "
            drop table if exists request_history;
            create table request_history (
                id text primary key,
                endpoint_id text,
                method text not null,
                url text not null,
                status integer,
                duration_ms integer,
                request_json text not null,
                created_at text not null default current_timestamp
            );
            ",
        )?;
    }
    Ok(())
}

fn read_auth_profiles(connection: &Connection) -> Result<Vec<AuthProfile>, String> {
    let mut statement = connection
        .prepare("select id, name, type, environment_id, secret_ref, enabled, config_json from auth_profiles order by environment_id, name")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            let config_json: String = row.get(6)?;
            Ok(AuthProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                r#type: row.get(2)?,
                environment_id: row.get(3)?,
                secret_ref: row.get(4)?,
                enabled: row.get::<_, i64>(5)? == 1,
                config: serde_json::from_str(&config_json).unwrap_or(serde_json::Value::Object(Default::default())),
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

fn read_request_templates(connection: &Connection) -> Result<Vec<RequestTemplate>, String> {
    let mut statement = connection
        .prepare("select id, name, request_json, auth_profile_id, created_at, updated_at from request_templates order by updated_at desc")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            let request_json: String = row.get(2)?;
            Ok(RequestTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                request: serde_json::from_str(&request_json).unwrap_or(serde_json::Value::Null),
                auth_profile_id: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

fn table_has_column(connection: &Connection, table: &str, column: &str) -> rusqlite::Result<bool> {
    let mut statement = connection.prepare(&format!("pragma table_info({table})"))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    for row in rows {
        if row? == column {
            return Ok(true);
        }
    }
    Ok(false)
}

fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
    let path = app_dir.join("rexvit.sqlite");
    init_database(&path).map_err(|error| error.to_string())?;
    Connection::open(path).map_err(|error| error.to_string())
}

fn read_favorites(connection: &Connection) -> Result<Vec<FavoriteEndpoint>, String> {
    let mut statement = connection
        .prepare("select endpoint_id, created_at from favorites order by created_at desc")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(FavoriteEndpoint {
                endpoint_id: row.get(0)?,
                created_at: row.get(1)?,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

fn read_variables(connection: &Connection) -> Result<Vec<EnvironmentVariable>, String> {
    let mut statement = connection
        .prepare("select id, environment_id, key, value, enabled from environment_variables order by environment_id, key")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(EnvironmentVariable {
                id: row.get(0)?,
                environment_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                enabled: row.get::<_, i64>(4)? == 1,
            })
        })
        .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())
}

fn seed_default_variables(connection: &Connection) -> Result<(), String> {
    let count: i64 = connection
        .query_row("select count(*) from environment_variables", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if count > 0 {
        return Ok(());
    }

    for (id, environment_id, key, value, enabled) in [
        ("dev-user-id", "dev", "userId", "usr_123", 1),
        ("dev-tenant-id", "dev", "tenantId", "tenant_acme", 1),
        ("dev-token", "dev", "token", "dev-token", 1),
        ("stage-user-id", "stage", "userId", "usr_stage", 1),
        ("prod-token", "prod", "token", "prod-token", 0),
    ] {
        connection
            .execute(
                "insert into environment_variables (id, environment_id, key, value, enabled) values (?1, ?2, ?3, ?4, ?5)",
                params![id, environment_id, key, value, enabled],
            )
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}
