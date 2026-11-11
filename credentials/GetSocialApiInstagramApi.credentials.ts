import type { IAuthenticateGeneric, ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';
export class GetSocialApiInstagramApi implements ICredentialType {
 name='getSocialApiInstagramApi';
 icon='file:../nodes/GetSocialApiInstagram/getsocialapi.svg' as const;
 test: ICredentialTestRequest={request:{baseURL:'https://api.getsocialapi.com/v1/ig/user/info/25025320'}};
 displayName='GetSocialAPI Instagram API';
 documentationUrl='https://getsocialapi.com/docs';
 properties: INodeProperties[]=[{displayName:'API Key',name:'apiKey',type:'string',typeOptions:{password:true},default:'',required:true}];
 authenticate: IAuthenticateGeneric={type:'generic',properties:{headers:{'X-API-Key':'={{$credentials.apiKey}}'}}};
}
