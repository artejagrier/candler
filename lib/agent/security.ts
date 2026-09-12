const SECRET_PATTERNS=[/\bsk_(?:live|test|proj)_[A-Za-z0-9_-]+/gi,/\b(?:ghp|github_pat)_[A-Za-z0-9_]+/gi,/\bBearer\s+[A-Za-z0-9._-]+/gi,/\b[A-Za-z0-9+/]{40,}={0,2}\b/g];
export function sanitizeAgentText(value:string){return SECRET_PATTERNS.reduce((text,pattern)=>text.replace(pattern,"[REDACTED_CREDENTIAL]"),value).slice(0,8000);}
export function assertAgentPayloadSafe(payload:unknown){const text=JSON.stringify(payload);for(const pattern of SECRET_PATTERNS){pattern.lastIndex=0;if(pattern.test(text))throw new Error("Agent payload rejected by secret boundary.");}}
