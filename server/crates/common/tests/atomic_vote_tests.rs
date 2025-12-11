use std::sync::Arc;
use testcontainers::{runners::AsyncRunner, ContainerAsync, ImageExt};
use testcontainers_modules::redis::Redis;
use uuid::Uuid;

use threadkit_common::{
    redis::RedisClient,
    types::{PageTree, TreeComment, VoteDirection},
};

struct TestContext {
    redis: Arc<RedisClient>,
    #[allow(dead_code)]
    redis_container: ContainerAsync<Redis>,
}

impl TestContext {
    async fn new() -> Self {
        let redis_container = Redis::default()
            .with_tag("7-alpine")
            .start()
            .await
            .expect("Failed to start Redis");

        let host = redis_container.get_host().await.expect("Failed to get host");
        let port = redis_container
            .get_host_port_ipv4(6379)
            .await
            .expect("Failed to get port");

        let redis_url = format!("redis://{}:{}", host, port);
        let redis = Arc::new(
            RedisClient::new(&redis_url)
                .await
                .expect("Failed to create Redis client"),
        );

        TestContext {
            redis,
            redis_container,
        }
    }

    /// Create a simple page tree with one root comment
    async fn create_simple_tree(&self, page_id: Uuid, comment_id: Uuid) -> PageTree {
        let now = chrono::Utc::now().timestamp_millis();
        let comment = TreeComment {
            id: comment_id,
            author_id: Uuid::now_v7(),
            name: "Test User".to_string(),
            avatar: None,
            karma: 0,
            text: "Test comment".to_string(),
            html: "<p>Test comment</p>".to_string(),
            upvotes: 0,
            downvotes: 0,
            created_at: now,
            modified_at: now,
            edited: false,
            replies: vec![],
            status: None,
            parent_id: None,
        };

        let tree = PageTree {
            comments: vec![comment],
            updated_at: now,
        };

        self.redis
            .set_page_tree(page_id, &tree)
            .await
            .expect("Failed to set page tree");

        tree
    }

    /// Create a tree with nested comments
    async fn create_nested_tree(
        &self,
        page_id: Uuid,
        root_id: Uuid,
        child_id: Uuid,
    ) -> PageTree {
        let now = chrono::Utc::now().timestamp_millis();
        let child = TreeComment {
            id: child_id,
            author_id: Uuid::now_v7(),
            name: "Test User".to_string(),
            avatar: None,
            karma: 0,
            text: "Child comment".to_string(),
            html: "<p>Child comment</p>".to_string(),
            upvotes: 0,
            downvotes: 0,
            created_at: now,
            modified_at: now,
            edited: false,
            replies: vec![],
            status: None,
            parent_id: Some(root_id),
        };

        let root = TreeComment {
            id: root_id,
            author_id: Uuid::now_v7(),
            name: "Test User".to_string(),
            avatar: None,
            karma: 0,
            text: "Root comment".to_string(),
            html: "<p>Root comment</p>".to_string(),
            upvotes: 0,
            downvotes: 0,
            created_at: now,
            modified_at: now,
            edited: false,
            replies: vec![child],
            status: None,
            parent_id: None,
        };

        let tree = PageTree {
            comments: vec![root],
            updated_at: now,
        };

        self.redis
            .set_page_tree(page_id, &tree)
            .await
            .expect("Failed to set page tree");

        tree
    }
}

#[tokio::test]
async fn test_upvote_no_existing_vote() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // First upvote
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .expect("Failed to vote");

    assert_eq!(final_vote, Some(VoteDirection::Up));
    assert_eq!(upvotes, 1);
    assert_eq!(downvotes, 0);
    assert_eq!(upvote_delta, 1);
    assert_eq!(downvote_delta, 0);

    // Verify tree was updated
    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].upvotes, 1);
    assert_eq!(tree.comments[0].downvotes, 0);
}

#[tokio::test]
async fn test_downvote_no_existing_vote() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // First downvote
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(
            user_id,
            page_id,
            comment_id,
            &[comment_id],
            VoteDirection::Down,
        )
        .await
        .expect("Failed to vote");

    assert_eq!(final_vote, Some(VoteDirection::Down));
    assert_eq!(upvotes, 0);
    assert_eq!(downvotes, 1);
    assert_eq!(upvote_delta, 0);
    assert_eq!(downvote_delta, 1);

    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].upvotes, 0);
    assert_eq!(tree.comments[0].downvotes, 1);
}

#[tokio::test]
async fn test_remove_upvote() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Upvote
    ctx.redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .expect("Failed to vote");

    // Click upvote again to remove it
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .expect("Failed to unvote");

    assert_eq!(final_vote, None);
    assert_eq!(upvotes, 0);
    assert_eq!(downvotes, 0);
    assert_eq!(upvote_delta, -1);
    assert_eq!(downvote_delta, 0);

    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].upvotes, 0);
    assert_eq!(tree.comments[0].downvotes, 0);
}

#[tokio::test]
async fn test_remove_downvote() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Downvote
    ctx.redis
        .atomic_vote(
            user_id,
            page_id,
            comment_id,
            &[comment_id],
            VoteDirection::Down,
        )
        .await
        .expect("Failed to vote");

    // Click downvote again to remove it
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(
            user_id,
            page_id,
            comment_id,
            &[comment_id],
            VoteDirection::Down,
        )
        .await
        .expect("Failed to unvote");

    assert_eq!(final_vote, None);
    assert_eq!(upvotes, 0);
    assert_eq!(downvotes, 0);
    assert_eq!(upvote_delta, 0);
    assert_eq!(downvote_delta, -1);
}

#[tokio::test]
async fn test_switch_upvote_to_downvote() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Upvote first
    ctx.redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .expect("Failed to vote");

    // Switch to downvote
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(
            user_id,
            page_id,
            comment_id,
            &[comment_id],
            VoteDirection::Down,
        )
        .await
        .expect("Failed to switch vote");

    assert_eq!(final_vote, Some(VoteDirection::Down));
    assert_eq!(upvotes, 0);
    assert_eq!(downvotes, 1);
    assert_eq!(upvote_delta, -1); // Removed upvote
    assert_eq!(downvote_delta, 1); // Added downvote

    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].upvotes, 0);
    assert_eq!(tree.comments[0].downvotes, 1);
}

#[tokio::test]
async fn test_switch_downvote_to_upvote() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Downvote first
    ctx.redis
        .atomic_vote(
            user_id,
            page_id,
            comment_id,
            &[comment_id],
            VoteDirection::Down,
        )
        .await
        .expect("Failed to vote");

    // Switch to upvote
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .expect("Failed to switch vote");

    assert_eq!(final_vote, Some(VoteDirection::Up));
    assert_eq!(upvotes, 1);
    assert_eq!(downvotes, 0);
    assert_eq!(upvote_delta, 1); // Added upvote
    assert_eq!(downvote_delta, -1); // Removed downvote

    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].upvotes, 1);
    assert_eq!(tree.comments[0].downvotes, 0);
}

#[tokio::test]
async fn test_vote_on_nested_comment() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let root_id = Uuid::now_v7();
    let child_id = Uuid::now_v7();

    ctx.create_nested_tree(page_id, root_id, child_id).await;

    // Vote on child comment (path: [root_id, child_id])
    let (final_vote, upvotes, downvotes, upvote_delta, downvote_delta) = ctx
        .redis
        .atomic_vote(
            user_id,
            page_id,
            child_id,
            &[root_id, child_id],
            VoteDirection::Up,
        )
        .await
        .expect("Failed to vote on nested comment");

    assert_eq!(final_vote, Some(VoteDirection::Up));
    assert_eq!(upvotes, 1);
    assert_eq!(downvotes, 0);
    assert_eq!(upvote_delta, 1);
    assert_eq!(downvote_delta, 0);

    // Verify child comment was updated
    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].replies[0].upvotes, 1);
    assert_eq!(tree.comments[0].replies[0].downvotes, 0);
}

#[tokio::test]
async fn test_concurrent_votes_same_comment() {
    let ctx = TestContext::new().await;

    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Simulate 10 concurrent upvotes from different users
    let mut handles = vec![];
    for _ in 0..10 {
        let user_id = Uuid::now_v7();
        let redis = Arc::clone(&ctx.redis);
        let handle = tokio::spawn(async move {
            redis
                .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
                .await
        });
        handles.push(handle);
    }

    // Wait for all votes
    for handle in handles {
        handle.await.expect("Task failed").expect("Vote failed");
    }

    // Verify final count is exactly 10
    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert_eq!(tree.comments[0].upvotes, 10);
    assert_eq!(tree.comments[0].downvotes, 0);
}

#[tokio::test]
async fn test_concurrent_vote_switches() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Rapidly switch votes (simulates user clicking up/down quickly)
    let redis = Arc::clone(&ctx.redis);
    let mut handles = vec![];

    for i in 0..20 {
        let redis_clone = Arc::clone(&redis);
        let direction = if i % 2 == 0 {
            VoteDirection::Up
        } else {
            VoteDirection::Down
        };

        let handle = tokio::spawn(async move {
            redis_clone
                .atomic_vote(user_id, page_id, comment_id, &[comment_id], direction)
                .await
        });
        handles.push(handle);
    }

    // Wait for all operations
    for handle in handles {
        handle.await.expect("Task failed").expect("Vote failed");
    }

    // Final state should be consistent (no negative counts)
    let tree = ctx
        .redis
        .get_page_tree(page_id)
        .await
        .expect("Failed to get tree")
        .expect("Tree not found");

    assert!(tree.comments[0].upvotes >= 0);
    assert!(tree.comments[0].downvotes >= 0);
    // Either upvoted, downvoted, or neutral
    assert!(tree.comments[0].upvotes <= 1);
    assert!(tree.comments[0].downvotes <= 1);
}

#[tokio::test]
async fn test_vote_nonexistent_page() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    // Don't create tree - page doesn't exist

    let result = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await;

    assert!(result.is_err());
    assert!(result.unwrap_err().to_string().contains("Page not found"));
}

#[tokio::test]
async fn test_vote_nonexistent_comment() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let existing_comment_id = Uuid::now_v7();
    let nonexistent_comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, existing_comment_id).await;

    // Try to vote on comment that doesn't exist
    let result = ctx
        .redis
        .atomic_vote(
            user_id,
            page_id,
            nonexistent_comment_id,
            &[nonexistent_comment_id],
            VoteDirection::Up,
        )
        .await;

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Comment not found"));
}

#[tokio::test]
async fn test_karma_calculation() {
    let ctx = TestContext::new().await;

    let user_id = Uuid::now_v7();
    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    ctx.create_simple_tree(page_id, comment_id).await;

    // Test all transitions and verify karma deltas

    // None -> Up: karma +1
    let (_, upvotes, downvotes, up_delta, down_delta) = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .unwrap();
    assert_eq!((upvotes, downvotes), (1, 0));
    assert_eq!((up_delta, down_delta), (1, 0)); // karma +1

    // Up -> Down: karma -2 (remove up, add down)
    let (_, upvotes, downvotes, up_delta, down_delta) = ctx
        .redis
        .atomic_vote(
            user_id,
            page_id,
            comment_id,
            &[comment_id],
            VoteDirection::Down,
        )
        .await
        .unwrap();
    assert_eq!((upvotes, downvotes), (0, 1));
    assert_eq!((up_delta, down_delta), (-1, 1)); // karma -2

    // Down -> Up: karma +2 (remove down, add up)
    let (_, upvotes, downvotes, up_delta, down_delta) = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .unwrap();
    assert_eq!((upvotes, downvotes), (1, 0));
    assert_eq!((up_delta, down_delta), (1, -1)); // karma +2

    // Up -> None: karma -1
    let (_, upvotes, downvotes, up_delta, down_delta) = ctx
        .redis
        .atomic_vote(user_id, page_id, comment_id, &[comment_id], VoteDirection::Up)
        .await
        .unwrap();
    assert_eq!((upvotes, downvotes), (0, 0));
    assert_eq!((up_delta, down_delta), (-1, 0)); // karma -1
}
