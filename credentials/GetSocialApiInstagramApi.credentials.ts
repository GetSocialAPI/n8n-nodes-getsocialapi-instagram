import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';
export class GetSocialApiInstagramApi implements ICredentialType {
 name='getSocialApiInstagramApi';
 displayName='GetSocialAPI Instagram API';
 documentationUrl='https://getsocialapi.com/docs';
 properties: INodeProperties[]=[{displayName:'API Key',name:'apiKey',type:'string',typeOptions:{password:true},default:'',required:true}];
 authenticate: IAuthenticateGeneric={type:'generic',properties:{headers:{'X-API-Key':'={{$credentials.apiKey}}'}}};
}
