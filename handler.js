'use strict';
const AWS = require('aws-sdk');
// const { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require('uuid');
const cisProvider = new AWS.CognitoIdentityServiceProvider({ apiVersion: '2016-04-18' });
const DynamoClient = new AWS.DynamoDB.DynamoDBClient({ region: 'us-west-2' });

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

module.exports.postConfirmationRegisterUserID = async (event, context, callback) => {
  const userId = uuidv4();

  const params = {
    UserPoolId: event.userPoolId,
    Username: event.userName,
    UserAttributes: [{
      Name: 'custom:userId',
      Value: userId,
    }],
  };

  if (event.request.userAttributes.userName) {
    try {
      await cisProvider.adminUpdateUserAttributes(params)
        .promise();

      console.log('Success');
    } catch (error) {
      callback(new Error(`postConfirmationRegisterUserID failed to modify userId: ${userId}, error: ${error}`));
    }
  }

  const putSessionItemCommand = new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      'UserID': {S: userId},
      'AccessLevel': {S: 'unset'},
    },
  });

  const response = DynamoClient.send(putSessionItemCommand).then((data) => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(
        {
          UserID: userId
        },
        null,
        2
      )
    };

    return response;
  }).catch((error) =>  {
    callback(new Error(`createUser failed, userId: ${userId}, error: ${error}`));
    return {
      statusCode: 500,
    }
  });

  return response;
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
