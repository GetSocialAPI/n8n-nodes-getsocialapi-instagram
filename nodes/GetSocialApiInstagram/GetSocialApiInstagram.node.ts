import type { IDataObject, IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IHttpRequestOptions } from 'n8n-workflow';
import { ApplicationError, NodeApiError, NodeOperationError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = "https://api.getsocialapi.com/v1";
const OPERATIONS: Record<string, { path: string; fields: string[] }> = {
  "userInfo": {
    "path": "/ig/user/info/{userId}",
    "fields": []
  },
  "userByUsername": {
    "path": "/ig/user/username_info/{username}",
    "fields": []
  },
  "profile": {
    "path": "/profile/{userId}",
    "fields": []
  },
  "userAbout": {
    "path": "/user/about/{userId}",
    "fields": []
  },
  "searchUsername": {
    "path": "/search/username/{query}",
    "fields": [
      "count"
    ]
  },
  "similarUsers": {
    "path": "/ig/user/similar/{userId}",
    "fields": []
  },
  "userMedias": {
    "path": "/ig/user/media/{userId}",
    "fields": [
      "count",
      "maxId"
    ]
  },
  "userTags": {
    "path": "/ig/user/tags/{userId}",
    "fields": [
      "count",
      "maxId"
    ]
  },
  "userStories": {
    "path": "/ig/user/stories/{userId}",
    "fields": []
  },
  "userHighlights": {
    "path": "/ig/user/highlights/{userId}",
    "fields": []
  },
  "highlightStories": {
    "path": "/ig/highlight/stories/{highlightId}",
    "fields": []
  },
  "followers": {
    "path": "/followers/{userId}",
    "fields": [
      "count",
      "maxId",
      "query"
    ]
  },
  "following": {
    "path": "/following/{userId}",
    "fields": [
      "count",
      "maxId",
      "query"
    ]
  },
  "mediaInfo": {
    "path": "/ig/media/info/{mediaId}",
    "fields": []
  },
  "mediaLikers": {
    "path": "/ig/media/likers/{mediaId}",
    "fields": []
  },
  "mediaComments": {
    "path": "/ig/media/comments/{mediaId}",
    "fields": [
      "count",
      "sortOrder",
      "minId"
    ]
  },
  "searchClips": {
    "path": "/ig/media/search_clips/{keyword}",
    "fields": []
  },
  "hashtagInfo": {
    "path": "/ig/hashtag/info/{tag}",
    "fields": []
  },
  "hashtagSearch": {
    "path": "/ig/hashtag/search/{query}",
    "fields": []
  },
  "hashtagPosts": {
    "path": "/v2/hashtag/posts/{tag}",
    "fields": [
      "maxId"
    ]
  },
  "locationInfo": {
    "path": "/ig/location/info/{locationId}",
    "fields": []
  },
  "locationMedia": {
    "path": "/ig/location/media/{locationId}",
    "fields": [
      "maxId"
    ]
  }
};
const QUERY_NAMES: Record<string, string> = { groupId: 'group_id', userId: 'user_id', maxId: 'max_id', minId: 'min_id', sortOrder: 'sort_order', perPage: 'per_page' };

function formatPathValue(name: string, value: string): string {
 const v = value.trim();
 if (!v) throw new ApplicationError(name + ' is required');
 if (['userId','groupId','locationId'].includes(name) && !/^\d{1,20}$/.test(v)) throw new ApplicationError(name + ' must be a numeric ID');
 if (name === 'mediaId' && !/^(?:\d{1,20}|[A-Za-z0-9_-]{5,64})$/.test(v)) throw new ApplicationError('Invalid media ID or shortcode');
 return encodeURIComponent(name === 'tag' ? v.replace(/^#+/,'') : name === 'highlightId' ? v.replace(/^highlight:/,'') : v);
}

type ListPage = { records: IDataObject[]; cursor?: string };

const LIST_OPERATIONS = new Set(["searchUsername", "similarUsers", "userMedias", "userTags", "userStories", "userHighlights", "highlightStories", "followers", "following", "mediaLikers", "mediaComments", "searchClips", "hashtagSearch", "hashtagPosts", "locationMedia"]);
const PAGINATED_OPERATIONS = new Set(["userMedias", "userTags", "followers", "following", "mediaComments", "hashtagPosts", "locationMedia"]);
const LEGACY_LIST_FIELDS = new Set(["count", "maxId", "minId", "query", "sortOrder"]);

const LIST_FIELDS: Record<string, string> = {
 searchUsername: 'users', similarUsers: 'users', userMedias: 'items', userTags: 'items',
 userHighlights: 'tray', followers: 'users', following: 'users', mediaLikers: 'users',
 mediaComments: 'comments', searchClips: 'items', hashtagSearch: 'results', hashtagPosts: 'posts',
};

function getListPage(response: IDataObject, operation: string, qs: Record<string, string | number>): ListPage {
 let values: unknown = response[LIST_FIELDS[operation]];
 if (operation === 'userStories') {
  values = (response.reel as { items?: IDataObject[] } | null)?.items ?? [];
 } else if (operation === 'highlightStories') {
  const reels = response.reels as Record<string, { items?: IDataObject[] }> | undefined;
  values = Object.values(reels ?? {}).flatMap(reel => reel.items ?? []);
 } else if (operation === 'locationMedia') {
  const sections = response.sections as Array<{
   layout_content?: { medias?: Array<{ media?: IDataObject }> };
  }> | undefined;
  values = sections?.flatMap(section => section.layout_content?.medias ?? [])
   .flatMap(({ media }) => media ? [media] : []);
 }
 if (!Array.isArray(values) && (response.status === 'fail' || response.error || response.message)) {
  throw new ApplicationError('Unexpected Instagram list response');
 }
 const records = (Array.isArray(values) ? values : []) as IDataObject[];
 const next = operation === 'mediaComments'
  ? (qs.sort_order === 'recent' && records.length > 0 ? response.next_min_id : undefined)
  : (response.more_available === false ? undefined : response.next_max_id);
 return { records, cursor: typeof next === 'string' && next ? next : undefined };
}

export class GetSocialApiInstagram implements INodeType {
 description: INodeTypeDescription = {
 displayName: 'GetSocialAPI Instagram', name: 'getSocialApiInstagram',
 icon: { light: 'file:getsocialapi.svg', dark: 'file:getsocialapi-dark.svg' }, usableAsTool: true, group: ['transform'], version: [1, 2], defaultVersion: 2,
 description: 'Retrieve Instagram data using GetSocialAPI',
 subtitle: '={{$parameter["resource"] + " / " + $parameter["operation"]}}',
 defaults: {name:'GetSocialAPI Instagram'},
 inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
 credentials: [{name:'getSocialApiInstagramApi',required:true}],
 properties: [
  {
    "displayName": "Resource",
    "name": "resource",
    "type": "options",
    "noDataExpression": true,
    "options": [
      {
        "name": "Profile",
        "value": "profile"
      },
      {
        "name": "Search",
        "value": "search"
      },
      {
        "name": "User Content",
        "value": "usercontent"
      },
      {
        "name": "Connections",
        "value": "connections"
      },
      {
        "name": "Media",
        "value": "media"
      },
      {
        "name": "Hashtag",
        "value": "hashtag"
      },
      {
        "name": "Location",
        "value": "location"
      }
    ],
    "default": "profile"
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "userInfo",
    "options": [
      {
        "name": "Get User Info",
        "value": "userInfo",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get User Info"
      },
      {
        "name": "Get User by Username",
        "value": "userByUsername",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get User by Username"
      },
      {
        "name": "Get Profile",
        "value": "profile",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Profile"
      },
      {
        "name": "Get User About",
        "value": "userAbout",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get User About"
      },
      {
        "name": "Get Similar Users",
        "value": "similarUsers",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Similar Users"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "searchUsername",
    "options": [
      {
        "name": "Search Usernames",
        "value": "searchUsername",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Search Usernames"
      },
      {
        "name": "Search Reels",
        "value": "searchClips",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Search Reels"
      },
      {
        "name": "Search Hashtags",
        "value": "hashtagSearch",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Search Hashtags"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "search"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "userMedias",
    "options": [
      {
        "name": "Get User Media",
        "value": "userMedias",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get User Media"
      },
      {
        "name": "Get Tagged Posts",
        "value": "userTags",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Tagged Posts"
      },
      {
        "name": "Get Stories",
        "value": "userStories",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Stories"
      },
      {
        "name": "Get Highlights",
        "value": "userHighlights",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Highlights"
      },
      {
        "name": "Get Highlight Stories",
        "value": "highlightStories",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Highlight Stories"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "usercontent"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "followers",
    "options": [
      {
        "name": "Get Followers",
        "value": "followers",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Followers"
      },
      {
        "name": "Get Following",
        "value": "following",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Following"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "mediaInfo",
    "options": [
      {
        "name": "Get Media Info",
        "value": "mediaInfo",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Media Info"
      },
      {
        "name": "Get Media Likers",
        "value": "mediaLikers",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Media Likers"
      },
      {
        "name": "Get Media Comments",
        "value": "mediaComments",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Media Comments"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "media"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "hashtagInfo",
    "options": [
      {
        "name": "Get Hashtag Info",
        "value": "hashtagInfo",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Hashtag Info"
      },
      {
        "name": "Get Hashtag Posts",
        "value": "hashtagPosts",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Hashtag Posts"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "hashtag"
        ]
      }
    }
  },
  {
    "displayName": "Operation",
    "name": "operation",
    "type": "options",
    "noDataExpression": true,
    "default": "locationInfo",
    "options": [
      {
        "name": "Get Location Info",
        "value": "locationInfo",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Location Info"
      },
      {
        "name": "Get Location Media",
        "value": "locationMedia",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Location Media"
      }
    ],
    "displayOptions": {
      "show": {
        "resource": [
          "location"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userInfo"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "Username",
    "name": "username",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userByUsername"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "profile"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userAbout"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "Query",
    "name": "query",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "searchUsername"
        ],
        "resource": [
          "search"
        ]
      }
    }
  },
  {
    "displayName": "Count",
    "name": "count",
    "type": "number",
    "default": 0,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "searchUsername"
        ],
        "resource": [
          "search"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 0,
      "maxValue": 50
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "similarUsers"
        ],
        "resource": [
          "profile"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userMedias"
        ],
        "resource": [
          "usercontent"
        ]
      }
    }
  },
  {
    "displayName": "Count",
    "name": "count",
    "type": "number",
    "default": 0,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "userMedias"
        ],
        "resource": [
          "usercontent"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 0,
      "maxValue": 50
    }
  },
  {
    "displayName": "Max ID (Cursor)",
    "name": "maxId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "userMedias"
        ],
        "resource": [
          "usercontent"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userTags"
        ],
        "resource": [
          "usercontent"
        ]
      }
    }
  },
  {
    "displayName": "Count",
    "name": "count",
    "type": "number",
    "default": 0,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "userTags"
        ],
        "resource": [
          "usercontent"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 0,
      "maxValue": 50
    }
  },
  {
    "displayName": "Max ID (Cursor)",
    "name": "maxId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "userTags"
        ],
        "resource": [
          "usercontent"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userStories"
        ],
        "resource": [
          "usercontent"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "userHighlights"
        ],
        "resource": [
          "usercontent"
        ]
      }
    }
  },
  {
    "displayName": "Highlight ID",
    "name": "highlightId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "highlightStories"
        ],
        "resource": [
          "usercontent"
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "followers"
        ],
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "Count",
    "name": "count",
    "type": "number",
    "default": 0,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "followers"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 0,
      "maxValue": 50
    }
  },
  {
    "displayName": "Max ID (Cursor)",
    "name": "maxId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "followers"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Query",
    "name": "query",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "followers"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "User ID",
    "name": "userId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "following"
        ],
        "resource": [
          "connections"
        ]
      }
    }
  },
  {
    "displayName": "Count",
    "name": "count",
    "type": "number",
    "default": 0,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "following"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 0,
      "maxValue": 50
    }
  },
  {
    "displayName": "Max ID (Cursor)",
    "name": "maxId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "following"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Query",
    "name": "query",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "following"
        ],
        "resource": [
          "connections"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Media ID or Shortcode",
    "name": "mediaId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "mediaInfo"
        ],
        "resource": [
          "media"
        ]
      }
    }
  },
  {
    "displayName": "Media ID or Shortcode",
    "name": "mediaId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "mediaLikers"
        ],
        "resource": [
          "media"
        ]
      }
    }
  },
  {
    "displayName": "Media ID or Shortcode",
    "name": "mediaId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "mediaComments"
        ],
        "resource": [
          "media"
        ]
      }
    }
  },
  {
    "displayName": "Count",
    "name": "count",
    "type": "number",
    "default": 0,
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "mediaComments"
        ],
        "resource": [
          "media"
        ],
        "@version": [
          1
        ]
      }
    },
    "typeOptions": {
      "minValue": 0,
      "maxValue": 50
    }
  },
  {
    "displayName": "Sort Order",
    "name": "sortOrder",
    "type": "options",
    "default": "recent",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "mediaComments"
        ],
        "resource": [
          "media"
        ],
        "@version": [
          1
        ]
      }
    },
    "options": [
      {
        "name": "Recent",
        "value": "recent"
      },
      {
        "name": "Ranked",
        "value": "ranked"
      }
    ]
  },
  {
    "displayName": "Min ID (Cursor)",
    "name": "minId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "mediaComments"
        ],
        "resource": [
          "media"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Keyword",
    "name": "keyword",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "searchClips"
        ],
        "resource": [
          "search"
        ]
      }
    }
  },
  {
    "displayName": "Hashtag",
    "name": "tag",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "hashtagInfo"
        ],
        "resource": [
          "hashtag"
        ]
      }
    }
  },
  {
    "displayName": "Query",
    "name": "query",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "hashtagSearch"
        ],
        "resource": [
          "search"
        ]
      }
    }
  },
  {
    "displayName": "Hashtag",
    "name": "tag",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "hashtagPosts"
        ],
        "resource": [
          "hashtag"
        ]
      }
    }
  },
  {
    "displayName": "Max ID (Cursor)",
    "name": "maxId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "hashtagPosts"
        ],
        "resource": [
          "hashtag"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Location ID",
    "name": "locationId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "locationInfo"
        ],
        "resource": [
          "location"
        ]
      }
    }
  },
  {
    "displayName": "Location ID",
    "name": "locationId",
    "type": "string",
    "default": "",
    "required": true,
    "displayOptions": {
      "show": {
        "operation": [
          "locationMedia"
        ],
        "resource": [
          "location"
        ]
      }
    }
  },
  {
    "displayName": "Max ID (Cursor)",
    "name": "maxId",
    "type": "string",
    "default": "",
    "required": false,
    "displayOptions": {
      "show": {
        "operation": [
          "locationMedia"
        ],
        "resource": [
          "location"
        ],
        "@version": [
          1
        ]
      }
    }
  },
  {
    "displayName": "Return All",
    "name": "returnAll",
    "type": "boolean",
    "default": false,
    "description": "Whether to return all results or only up to a given limit",
    "displayOptions": {
      "show": {
        "operation": [
          "searchUsername",
          "similarUsers",
          "userMedias",
          "userTags",
          "userStories",
          "userHighlights",
          "highlightStories",
          "followers",
          "following",
          "mediaLikers",
          "mediaComments",
          "searchClips",
          "hashtagSearch",
          "hashtagPosts",
          "locationMedia"
        ],
        "@version": [
          2
        ]
      }
    }
  },
  {
    "displayName": "Limit",
    "name": "limit",
    "type": "number",
    "default": 50,
    "description": "Max number of results to return",
    "typeOptions": {
      "minValue": 1
    },
    "displayOptions": {
      "show": {
        "operation": [
          "searchUsername",
          "similarUsers",
          "userMedias",
          "userTags",
          "userStories",
          "userHighlights",
          "highlightStories",
          "followers",
          "following",
          "mediaLikers",
          "mediaComments",
          "searchClips",
          "hashtagSearch",
          "hashtagPosts",
          "locationMedia"
        ],
        "returnAll": [
          false
        ],
        "@version": [
          2
        ]
      }
    }
  },
  {
    "displayName": "Additional Fields",
    "name": "additionalFields",
    "type": "collection",
    "placeholder": "Add Field",
    "default": {},
    "options": [
      {
        "displayName": "Name Filter",
        "name": "query",
        "type": "string",
        "default": ""
      }
    ],
    "displayOptions": {
      "show": {
        "operation": [
          "followers",
          "following"
        ],
        "@version": [
          2
        ]
      }
    }
  },
  {
    "displayName": "Additional Fields",
    "name": "additionalFields",
    "type": "collection",
    "placeholder": "Add Field",
    "default": {},
    "options": [
      {
        "displayName": "Sort Order",
        "name": "sortOrder",
        "type": "options",
        "default": "recent",
        "options": [
          {
            "name": "Recent",
            "value": "recent"
          },
          {
            "name": "Ranked",
            "value": "ranked"
          }
        ],
        "description": "Order of comments. Recent supports cursor pagination. Ranked returns the available preview page."
      }
    ],
    "displayOptions": {
      "show": {
        "operation": [
          "mediaComments"
        ],
        "@version": [
          2
        ]
      }
    }
  }
]
 };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const output: INodeExecutionData[] = [];
  const legacy = this.getNode().typeVersion === 1;
  for (let i = 0; i < items.length; i++) {
   try {
    const operation = this.getNodeParameter('operation', i) as string;
    const cfg = OPERATIONS[operation];
    if (!cfg || !Object.prototype.hasOwnProperty.call(OPERATIONS, operation)) {
     throw new NodeOperationError(this.getNode(), 'Unsupported operation', { itemIndex: i });
    }
    const path = cfg.path.replace(/\{(\w+)\}/g, (_match, name: string) =>
     formatPathValue(name, String(this.getNodeParameter(name, i))),
    );
    const qs: Record<string, string | number> = {};
    const fields = legacy ? cfg.fields : cfg.fields.filter(field => !LEGACY_LIST_FIELDS.has(field));
    for (const field of fields) {
     const value = this.getNodeParameter(field, i, '') as string | number;
     if (value === '' || value === null || value === undefined || value === 0) continue;
     qs[QUERY_NAMES[field] ?? field] = value;
    }
    const additional = legacy ? {} : this.getNodeParameter('additionalFields', i, {}) as IDataObject;
    if (!legacy && typeof additional.query === 'string' && additional.query) qs.query = additional.query;
    if (operation === 'following' && qs.count === undefined) qs.count = 25;
    if (!legacy && operation === 'mediaComments') qs.sort_order = additional.sortOrder === 'ranked' ? 'ranked' : 'recent';
    const isList = !legacy && LIST_OPERATIONS.has(operation);
    const returnAll = isList && this.getNodeParameter('returnAll', i, false) === true;
    const limit = isList && !returnAll ? Number(this.getNodeParameter('limit', i, 50)) : Infinity;
    if (!returnAll && isList && (!Number.isSafeInteger(limit) || limit < 1)) {
     throw new NodeOperationError(this.getNode(), 'Limit must be a positive integer', { itemIndex: i });
    }

    const records: IDataObject[] = [];
    const seenCursors = new Set<string>();
    const seenIds = new Set<string>();
    while (true) {
     const request: IHttpRequestOptions = { method: 'GET', url: BASE_URL + path, qs, json: true, timeout: 30000 };
     const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this, 'getSocialApiInstagramApi', request);
     const json = response && typeof response === 'object' && !Array.isArray(response)
      ? response as IDataObject : { data: response } as IDataObject;
     if (!isList) {
      records.push(json);
      break;
     }

     const page = getListPage(json, operation, qs);
     for (const record of page.records) {
      const id = record.pk ?? record.id;
      if (typeof id === 'string' || typeof id === 'number') {
       if (seenIds.has(String(id))) continue;
       seenIds.add(String(id));
      }
      records.push(record);
      if (records.length >= limit) break;
     }
     const cursor = page.cursor;
     if (records.length >= limit || !PAGINATED_OPERATIONS.has(operation) || !cursor || seenCursors.has(cursor)) break;
     seenCursors.add(cursor);
     qs[operation === 'mediaComments' ? 'min_id' : 'max_id'] = cursor;
    }
    for (const json of records) output.push({ json, pairedItem: { item: i } });
   } catch (error) {
    if (this.continueOnFail()) {
     output.push({ json: { error: error instanceof Error ? error.message : String(error) }, pairedItem: { item: i } });
     continue;
    }
    if (error instanceof NodeOperationError) {
     throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
    }
    throw new NodeApiError(this.getNode(), { message: error instanceof Error ? error.message : String(error) }, { itemIndex: i });
   }
  }
  return [output];
 }
}
