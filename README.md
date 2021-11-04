# 281-peer2peer-sessions-service

## Deploy
```
$ serverless login # shared organization account
$ serverless deploy --stage [stage]
```

## Endpoints v0
```
CreateSession

Path: /v0/sessions
Method: POST
Request Headers:
{
  Authorization: Bearer JWT Token,
}

Request Body: 
{
  "ToUserID": <UserID of Friend>,
}

Response Body:
{
  "Session": {
    "SessionID": <SessionID>,
    "ToUserID": <UserID>, # from the requesters perspective
    "SocketURL": <SocketURL>, 
  }
}
```

```
v0 GetSession

Path: /v0/sessions/<SessionID>
Method: GET
Request Headers:
{
  Authorization: Bearer JWT Token, # UserID Claim must match at least 1 of the UserIDs associated with the session
}

Response Body:
{
  "Session": {
    "SessionID": <SessionID>,
    "ToUserID": <UserID>, # from the requesters perspective
    "SocketURL": <SocketURL>, 
  }
}
```

```
v0 CloseSession

Path: /v0/sessions/<SessionID>
Method: DELETE
```