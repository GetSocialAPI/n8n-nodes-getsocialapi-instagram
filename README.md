# n8n-nodes-getsocialapi-instagram

Community node connecting [n8n](https://n8n.io/) to [GetSocialAPI](https://getsocialapi.com/) Instagram REST API.

## Supported operations (22)

- **Get User Info** (`userInfo`): `GET /ig/user/info/{userId}`
- **Get User by Username** (`userByUsername`): `GET /ig/user/username_info/{username}`
- **Get Profile** (`profile`): `GET /profile/{userId}`
- **Get User About** (`userAbout`): `GET /user/about/{userId}`
- **Search Usernames** (`searchUsername`): `GET /search/username/{query}`
- **Get Similar Users** (`similarUsers`): `GET /ig/user/similar/{userId}`
- **Get User Media** (`userMedias`): `GET /ig/user/media/{userId}`
- **Get Tagged Posts** (`userTags`): `GET /ig/user/tags/{userId}`
- **Get Stories** (`userStories`): `GET /ig/user/stories/{userId}`
- **Get Highlights** (`userHighlights`): `GET /ig/user/highlights/{userId}`
- **Get Highlight Stories** (`highlightStories`): `GET /ig/highlight/stories/{highlightId}`
- **Get Followers** (`followers`): `GET /followers/{userId}`
- **Get Following** (`following`): `GET /following/{userId}`
- **Get Media Info** (`mediaInfo`): `GET /ig/media/info/{mediaId}`
- **Get Media Likers** (`mediaLikers`): `GET /ig/media/likers/{mediaId}`
- **Get Media Comments** (`mediaComments`): `GET /ig/media/comments/{mediaId}`
- **Search Reels** (`searchClips`): `GET /ig/media/search_clips/{keyword}`
- **Get Hashtag Info** (`hashtagInfo`): `GET /ig/hashtag/info/{tag}`
- **Search Hashtags** (`hashtagSearch`): `GET /ig/hashtag/search/{query}`
- **Get Hashtag Posts** (`hashtagPosts`): `GET /v2/hashtag/posts/{tag}`
- **Get Location Info** (`locationInfo`): `GET /ig/location/info/{locationId}`
- **Get Location Media** (`locationMedia`): `GET /ig/location/media/{locationId}`

## Setup

1. [Create a GetSocialAPI account](https://getsocialapi.com/dashboard/signup/) and copy your API key from the [dashboard](https://getsocialapi.com/dashboard/). The trial includes 100 API calls with no credit card required.
2. In n8n, install this community package and create **GetSocialAPI Instagram API** credentials.
3. Select an operation. No Instagram profile login or cookies are needed.

The API key is sent as `X-API-Key`. Single-object operations return the API response. List operations return one n8n item per record. Use **Return All** to retrieve all available records, or disable it and set **Limit**. The node follows API cursors internally. Some endpoints only expose one page, including the **Ranked** comments preview. Existing workflows using node version 1 retain their original response format and parameters.

See https://getsocialapi.com/docs for full API details.

## Billing and pagination

The n8n node is free to install. API calls use the quota of the GetSocialAPI account that owns the key. GetSocialAPI counts requests that return HTTP `200` or `404`. See the [GetSocialAPI pricing plans](https://getsocialapi.com/#pricing) and [rate limits](https://getsocialapi.com/docs/rate-limits/).

Each page fetched is a separate API request. For example, if **Return All** fetches 10 pages that each return `200`, one node execution uses 10 GetSocialAPI requests. To cap the number of records returned, turn off **Return All** and set **Limit**. The node may still fetch multiple pages to reach that limit.

## Usage example

### Get an Instagram profile by username

1. Add the **GetSocialAPI Instagram** node and select your API credentials.
2. Set **Resource** to **Profile** and **Operation** to **Get User by Username**.
3. Enter `nike` as **Username**, then execute the node.

Example output (abbreviated):

```json
{
  "user": {
    "username": "nike",
    "is_verified": true
  }
}
```

For **Get Followers**, use the numeric ID from the profile response. Turn off **Return All** and set **Limit** to 10 to retrieve up to ten followers.

## Development

```sh
npm install
npm run lint
npm run build
npm run dev
```

## Release

See [PUBLISHING.md](PUBLISHING.md).

## License

MIT
