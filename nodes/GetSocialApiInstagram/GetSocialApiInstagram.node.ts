import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IHttpRequestOptions } from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';

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
 if (!v) throw new Error(name + ' is required');
 if (['userId','groupId','locationId'].includes(name) && !/^\\d{1,20}$/.test(v)) throw new Error(name + ' must be a numeric ID');
 if (name === 'mediaId' && !/^(?:\\d{1,20}|[A-Za-z0-9_-]{5,64})$/.test(v)) throw new Error('Invalid media ID or shortcode');
 return encodeURIComponent(name === 'tag' ? v.replace(/^#+/,'') : name === 'highlightId' ? v.replace(/^highlight:/,'') : v);
}

export class GetSocialApiInstagram implements INodeType {
 description: INodeTypeDescription = {
 displayName: 'GetSocialAPI Instagram', name: 'getSocialApiInstagram',
 icon: 'file:getsocialapi.svg', group: ['transform'], version: 1,
 description: 'Retrieve Instagram data using GetSocialAPI',
 defaults: {name:'GetSocialAPI Instagram'},
 inputs: [NodeConnectionType.Main], outputs: [NodeConnectionType.Main],
 credentials: [{name:'getSocialApiInstagramApi',required:true}],
 properties: [
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
        "name": "Search Usernames",
        "value": "searchUsername",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Search Usernames"
      },
      {
        "name": "Get Similar Users",
        "value": "similarUsers",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Similar Users"
      },
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
      },
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
      },
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
      },
      {
        "name": "Search Reels",
        "value": "searchClips",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Search Reels"
      },
      {
        "name": "Get Hashtag Info",
        "value": "hashtagInfo",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Hashtag Info"
      },
      {
        "name": "Search Hashtags",
        "value": "hashtagSearch",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Search Hashtags"
      },
      {
        "name": "Get Hashtag Posts",
        "value": "hashtagPosts",
        "description": "Retrieve data using GetSocialAPI",
        "action": "Get Hashtag Posts"
      },
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
    ]
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
        ]
      }
    }
  }
]
 };
 async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const output: INodeExecutionData[] = [];
  for(let i=0;i<items.length;i++){
   try {
    const operation = this.getNodeParameter('operation',i) as string;
    const cfg = OPERATIONS[operation];
    if(!cfg) throw new NodeOperationError(this.getNode(),'Unsupported operation',{itemIndex:i});
    const path = cfg.path.replace(/\\{(\\w+)\\}/g, (_m,name:string) => formatPathValue(name,String(this.getNodeParameter(name,i))));
    const qs: Record<string,string|number> = {};
    for(const field of cfg.fields){
     const value = this.getNodeParameter(field,i,'') as string | number;
     if(value === '' || value === null || value === undefined || value === 0) continue;
     if(field === 'feedType' || field === 'feedId') continue;
     qs[QUERY_NAMES[field] ?? field] = value;
    }
    if(operation === 'feed'){
     const type = this.getNodeParameter('feedType',i) as string;
     const id = String(this.getNodeParameter('feedId',i));
     if(!/^\\d{1,20}$/.test(id)) throw new NodeOperationError(this.getNode(),'Feed ID must be numeric',{itemIndex:i});
     qs[type === 'group'?'group_id':'user_id'] = id;
    }
    if(operation === 'following' && "instagram" === 'instagram' && qs.count === undefined) qs.count=25;
    const request: IHttpRequestOptions = {method:'GET',url:BASE_URL+path,qs,json:true,timeout:30000};
    const response: unknown = await this.helpers.httpRequestWithAuthentication.call(this,'getSocialApiInstagramApi',request);
    const json = response && typeof response === 'object' && !Array.isArray(response) ? response as INodeExecutionData['json'] : {data:response} as INodeExecutionData['json'];
    output.push({json,pairedItem:{item:i}});
   } catch(error){
    if(this.continueOnFail()){output.push({json:{error:error instanceof Error?error.message:String(error)},pairedItem:{item:i}});continue;}
    if(error instanceof NodeOperationError)throw error;
    throw new NodeApiError(this.getNode(),error as any,{itemIndex:i});
   }
  }
  return [output];
 }
}
