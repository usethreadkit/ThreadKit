-- Atomically process a vote to prevent race conditions
-- This script handles vote transitions and updates the comment tree in a single atomic operation
--
-- KEYS[1]: vote_key (votes:{user_id}:{page_id})
-- KEYS[2]: tree_key (page:{page_id})
-- ARGV[1]: comment_id (UUID)
-- ARGV[2]: new_direction ("1" for up, "-1" for down)
-- ARGV[3]: path_json (JSON array of UUIDs in path)
--
-- Returns: {final_vote, upvotes, downvotes, upvote_delta, downvote_delta}

local vote_key = KEYS[1]
local tree_key = KEYS[2]
local comment_id = ARGV[1]
local new_direction = ARGV[2]
local path_json = ARGV[3]

-- Get existing vote
local existing_vote = redis.call('HGET', vote_key, comment_id)

-- Get tree
local tree_json = redis.call('GET', tree_key)
if not tree_json then
    return redis.error_reply("Page not found")
end

-- Decode tree
local tree = cjson.decode(tree_json)

-- Navigate to comment using path
local comment = nil
local path = cjson.decode(path_json)

-- For root comments, search in tree.c (comments array)
-- For nested comments, search in parent.ch (children array)
for i, pid in ipairs(path) do
    local found = false
    local search_array = nil

    if i == 1 then
        -- First level: search in tree.c (root comments)
        search_array = tree.c
    else
        -- Nested: search in comment.r (replies)
        search_array = comment and comment.r
    end

    if search_array then
        for j, child in ipairs(search_array) do
            if child.i == pid then
                comment = child
                found = true
                break
            end
        end
    end

    if not found then
        return redis.error_reply("Comment not found in path")
    end
end

if not comment then
    return redis.error_reply("Comment not found")
end

-- Calculate deltas based on vote transition
local upvote_delta = 0
local downvote_delta = 0
local final_vote = nil

if not existing_vote then
    -- No existing vote
    if new_direction == "1" then
        upvote_delta = 1
        final_vote = "1"
    else
        downvote_delta = 1
        final_vote = "-1"
    end
elseif existing_vote == new_direction then
    -- Same vote, remove it
    if existing_vote == "1" then
        upvote_delta = -1
    else
        downvote_delta = -1
    end
    final_vote = nil
else
    -- Different vote, switch
    if existing_vote == "1" then
        upvote_delta = -1
        downvote_delta = 1
    else
        upvote_delta = 1
        downvote_delta = -1
    end
    final_vote = new_direction
end

-- Update comment counts (using compact field names: u=upvotes, d=downvotes)
comment.u = math.max(0, (comment.u or 0) + upvote_delta)
comment.d = math.max(0, (comment.d or 0) + downvote_delta)

-- Update tree timestamp (u=updated_at) - convert Redis TIME to number
tree.u = tonumber(redis.call('TIME')[1])

-- Save updated tree
redis.call('SET', tree_key, cjson.encode(tree))

-- Update vote
if final_vote then
    redis.call('HSET', vote_key, comment_id, final_vote)
else
    redis.call('HDEL', vote_key, comment_id)
end

return {final_vote or "", comment.u, comment.d, upvote_delta, downvote_delta}
