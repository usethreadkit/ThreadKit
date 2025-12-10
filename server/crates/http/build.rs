use std::process::Command;

fn main() {
    // Get git commit hash
    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output();
    
    if let Ok(output) = output {
        let git_hash = String::from_utf8(output.stdout).unwrap_or_default();
        println!("cargo:rustc-env=GIT_COMMIT={}", git_hash.trim());
    } else {
        println!("cargo:rustc-env=GIT_COMMIT=unknown");
    }

    // Get build date
    let output = Command::new("date")
        .args(["+%Y-%m-%d %H:%M:%S"])
        .output();
    
    if let Ok(output) = output {
        let build_date = String::from_utf8(output.stdout).unwrap_or_default();
        println!("cargo:rustc-env=BUILD_DATE={}", build_date.trim());
    } else {
        println!("cargo:rustc-env=BUILD_DATE=unknown");
    }

    // Re-run if .git/HEAD changes (commits)
    println!("cargo:rerun-if-changed=../../.git/HEAD");
}
