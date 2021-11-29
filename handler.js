'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const { DynamoDBClient, GetItemCommand, UpdateItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
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
      'FirstName': {S: event.givenName},
      'LastName': {S: event.familyName},
      'Email': {S: event.email},
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
      'UserID': {S: userName}
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
      message: 'successfully updated AccessLevel',
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
      'UserID': {S: userName}
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

  if (userInfo.AccessLevel.S != "Admin" && userId != userName){
    console.info(`getUserInformation: insufficient permissions to access resource, requester: ${userName}, userId ${userId}, al ${userInfo.AccessLevel.S}`);
    return {statusCode: 403};
  }

  console.log("getUserInformation: jwt claims verified successfully");
  console.log("getUserInformation: userInfo", userInfo);

  if (userInfo == null) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      UserID: userName,
      Street: userInfo.Street.S,
      City: userInfo.City.S,
      State: userInfo.Province.S,
      Zipcode: userInfo.Zipcode.N,
      AccessLevel: userInfo.AccessLevel.S,
      Email: userInfo.Email.S,
      FirstName: userInfo.FirstName.S,
      LastName: userInfo.LastName.S,
    }),
  };
}

module.exports.listUsers = async (event) => {
  const userName = event.requestContext.authorizer.jwt.claims["cognito:username"];
  console.log(`listUsers: request from auth claim ${event.requestContext.authorizer.jwt.claims["cognito:username"]}`);

  const cmd = new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'UserID': {S: userName}
    },
  });

  let userInfo;
  try {
    const ui = await ddbc.send(cmd);
    console.log("listUsers: userInfo retrieved");
    userInfo = ui.Item;
  } catch (err) {
    console.error("listUsers: failed to get user info error:", err);
    return {statusCode: 403};
  }



  if (userInfo.AccessLevel.S != "Admin"){
    console.info(`listUsers: insufficient permissions to access resource, requester: ${userName}, al ${userInfo.AccessLevel.S}`);
    return {statusCode: 403};
  }

  console.log("listUsers: jwt claims verified successfully");

  const scanCmd = new ScanCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Select: "ALL_ATTRIBUTES"
  });

  let usersList;
  try {
    const list = await ddbc.send(scanCmd)
    console.log("listUSers: userList scanned", list);
    usersList = list.Items;
  } catch (err) {
    console.error("listUsers: dynamodb failed to get users list");
    return {statusCode: 403};
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(usersList),
  };
}
