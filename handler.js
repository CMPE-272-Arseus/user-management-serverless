'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const ddbc = new DynamoDBClient({region: 'us-west-2'});

module.exports.hello = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: `${process.env.DYNAMODB_TABLE}`,
        input: event,
      },
      null,
      2
    ),
  };
};

module.exports.postConfirmationRegisterUserID = (event) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      'UserID': {S: event.userName},
      'AccessLevel': {S: 'unset'},
    },
  };

  ddb.putItem(params, function(err, data) {
    if (err){
      console.log(`postConfirmationRegisterUserID: failed to create entry in table userId: ${event.userName}, error: ${error}`)
      callback(null, event);
    } else {
      console.log("postConfirmationRegisterUserID: successfully wrote to db");
      callback(null, event);
    }
  });
};

module.exports.updateUserInformation = async (event) => {
  const { userId } = event.pathParameters;
  const { Street, City, State, Zipcode, AccessLevel } = JSON.parse(event.body);
  const userName = event.requestContext.authorizer.jwt.claims["cognito:username"];
  console.log("updateUserInformation: AccessLevel", AccessLevel);
  console.log("updateUserInformation: requester", event.requestContext.authorizer.jwt.claims["cognito:username"]);
  console.log(`updateUserInformation: authorizer claim, userName ${userName}`);

  const cmd = new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': {S: userId}
    },
  });

  let reqAccessLvl;
  try {
    const userInfo = await ddbc.send(cmd);
    console.log("updateUserInformation: access level retrieved", userInfo.Item.AccessLevel.S);
    reqAccessLvl = userInfo.Item.AccessLevel.S;
  } catch (err) {
    console.error("updateUserInformation: failed to get caller access level error:", err);
    return {statusCode: 403};
  }

  if (reqAccessLvl != "Admin" && userId != userName){
    console.info(`updateUserInformation: insufficient permissions to access resource, requester: ${userName}, userId ${userId}, al ${data.AccessLevel}`);
    return {statusCode: 403};
  }

  const addressCmd = new UpdateItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': {S: userId},
    },
    UpdateExpression: "set Street=:street, City=:city, Province=:state, Zipcode=:zipcode",
    ExpressionAttributeValues:{
      ":street":{S: Street},
      ":city":{S: City},
      ":state":{S: State},
      ":zipcode":{N: Zipcode},
    },
    ReturnValues:"UPDATED_NEW"
  });

  try {
    const data = await ddbc.send(addressCmd);
    console.log("updateUserInformation: successfully updated addresses, data", data);
  } catch (err) {
    console.error("updateUserInformation: failed to update address information, error", err);
    return { statusCode:500 };
  }

  if (!AccessLevel || reqAccessLvl != "Admin") {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'successfully updated address',
      }),
    };
  }

  const updateAccessLevelCmd = new UpdateItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': {S: userId},
    },
    UpdateExpression: "set AccessLevel=:a",
    ExpressionAttributeValues:{
      ":a":{S: AccessLevel},
    },
    ReturnValues:"UPDATED_NEW"
  });

  try {
    const data = await ddbc.send(updateAccessLevelCmd);
    console.log("updateUserInformation: successfully updated accesslevel, data", data);
    return {
      statusCode:200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      message: 'successfully AccessLevel',
    };
  } catch (err) {
    console.error("updateUserInformation: failed to update accesslevel, error", err);
    return { statusCode:500 };
  }
}

module.exports.getUserInformation = async (event) => {
  const { userId } = event.pathParameters;
  const userName = event.requestContext.authorizer.jwt.claims["cognito:username"];
  console.log(`getUserInformation: request from auth claim ${event.requestContext.authorizer.jwt.claims["cognito:username"]}`);

  const cmd = new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': {S: userId}
    },
  });

  let userInfo;
  try {
    const ui = await ddbc.send(cmd);
    console.log("getUserInformation: userInfo retrieved");
    userInfo = ui.Item;
  } catch (err) {
    console.error("getUserInformation: failed to get user info error:", err);
    return {statusCode: 403};
  }

  if (userInfo.AccessLevel != "Admin" && userId != userName){
    console.info(`getUserInformation: insufficient permissions to access resource, requester: ${userName}, userId ${userId}, al ${userInfo.AccessLevel}`);
    return {statusCode: 403};
  }

  console.log("getUserInformation: jwt claims verified successfully");
  console.log("getUserInformation: userInfo", userInfo);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      UserID: userName,
      Street: userInfo.Street,
      City: userInfo.City,
      State: userInfo.Province,
      Zipcode: userInfo.Zipcode,
      AccessLevel: userInfo.AccessLevel,
    }),
  };
}


// module.exports.getSession = async (event, context, callback) => {
//   const { sessionId } = event.pathParameters;

//   const getItemCommand = new GetItemCommand({
//     TableName: process.env.DYNAMODB_TABLE,
//     Key: {
//       'SessionID': { S: sessionId },
//     }
//   });

//   const response = {statusCode: 200};

//   DynamoClient.send(getItemCommand).then((data) => {
//     console.log(`data:${data}`);
//     response.body = JSON.stringify({
//       Session: {
//         SessionID: data.Item.SessionID,
//         ToUserID: data.Item.FromUserID,
//         SocketURL: "socket service not setup yet",
//       }
//     }, null, 2);
//   }).catch((error) => {
//     callback(new Error(`getSession failed, SessionID: ${sessionId}, error: ${error}`));
//   });

//   callback(null, response);
// };

// module.exports.closeSession = async (event, context, callback) => {
//   const { sessionId } = event.pathParameters;

//   const deleteItemCommand = new DeleteItemCommand({
//     TableName: process.env.DYNAMODB_TABLE,
//     Key: {
//       'SessionID': { S: sessionId }
//     }
//   });

//   DynamoClient.send(deleteItemCommand).catch((error) => {
//     callback(new Error(`deleteSession failed, SessionID: ${SessionID}, error: ${error}`));
//   });

//   const response = {
//     statusCode: 200,
//   };

//   callback(null, response);
// };
