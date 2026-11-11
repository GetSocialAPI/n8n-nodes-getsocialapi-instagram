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

1. Get your API key from https://getsocialapi.com/dashboard/
2. In n8n, install this community package and create **GetSocialAPI Instagram API** credentials.
3. Select an operation. No Instagram profile login or cookies are needed.

API key is sent as `X-API-Key`. Operations return raw JSON responses. Cursor fields are available for manual pagination; automatic multi-page iteration is not yet provided.

See https://getsocialapi.com/docs for full API details.

## Development

```sh
npm install
npm run lint
npm run build
npm run dev
```

## Release

See PUBLISHING.md. Do not publish until CI and real API tests pass.

## License

MIT
