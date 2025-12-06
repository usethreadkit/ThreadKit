//! Outputs the OpenAPI JSON spec to stdout.
//! Usage: cargo run --bin openapi > openapi.json

use threadkit_http::openapi::ApiDoc;
use utoipa::OpenApi;

fn main() {
    let spec = ApiDoc::openapi().to_pretty_json().unwrap();
    println!("{}", spec);
}
