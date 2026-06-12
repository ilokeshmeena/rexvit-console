use crate::ApiRequest;

fn normalize_os_name(value: &str) -> &str {
    let normalized = value.to_ascii_lowercase();
    if normalized.contains("windows") {
        "Windows"
    } else if normalized.contains("mac") || normalized.contains("darwin") {
        "macOS"
    } else if normalized.contains("linux") {
        "Linux"
    } else {
        "Unknown"
    }
}

fn normalize_architecture(value: &str) -> &str {
    let normalized = value.to_ascii_lowercase();
    if normalized.contains("arm64") || normalized.contains("aarch64") || normalized.contains("arm") {
        "arm64"
    } else if normalized.contains("x86_64") || normalized.contains("amd64") || normalized.contains("x64") {
        "x64"
    } else {
        "unknown"
    }
}

fn get_os_name() -> &'static str {
    normalize_os_name(std::env::consts::OS)
}

fn get_architecture_name() -> &'static str {
    normalize_architecture(std::env::consts::ARCH)
}

fn build_user_agent(version: &str, os: &str, architecture: &str) -> String {
    format!("RexVitConsole/{version} ({os}; {architecture})")
}

fn default_user_agent() -> String {
    build_user_agent(env!("CARGO_PKG_VERSION"), get_os_name(), get_architecture_name())
}

fn has_explicit_user_agent_header(headers: &[crate::HeaderPair]) -> bool {
    headers.iter().any(|header| header.enabled && header.key.eq_ignore_ascii_case("user-agent"))
}

pub fn ensure_user_agent_header(request: ApiRequest) -> ApiRequest {
    if has_explicit_user_agent_header(&request.headers) {
        return request;
    }

    let mut headers = request.headers;
    headers.push(crate::HeaderPair {
        key: "User-Agent".to_string(),
        value: default_user_agent(),
        enabled: true,
    });

    ApiRequest { headers, ..request }
}
