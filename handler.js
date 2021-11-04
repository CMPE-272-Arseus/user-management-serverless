'use strict';
const { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require('uuid');

const DynamoClient = new DynamoDBClient({ region: 'us-west-2' });

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

module.exports.createSession = async (event, context, callback) => {
  const { ToUserID } = JSON.parse(event.body);
  const sessionId = uuidv4();

  // TODO: Get a socket url from the socket server

  const putSessionItemCommand = new PutItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      'SessionID': {S: sessionId},
      'FromUserID': {S: 'hardcoded here'},
      'ToUserID': {S: ToUserID},
      // socket url
    },
  });

  const response = DynamoClient.send(putSessionItemCommand).then((data) => {
    const response = {
      statusCode: 200,
      body: JSON.stringify(
        {
          SessionID: sessionId
        },
        null,
        2
      )
    };

    return response;
  }).catch((error) =>  {
    callback(new Error(`createSession failed, userId: ${ToUserID}, error: ${error}`));

    return {
      statusCode: 500,
    }
  });

  return response;
};

module.exports.getSession = async (event, context, callback) => {
  const { sessionId } = event.pathParameters;

  const getItemCommand = new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'SessionID': { S: sessionId },
    }
  });

  const response = {statusCode: 200};

  DynamoClient.send(getItemCommand).then((data) => {
    console.log(`data:${data}`);
    response.body = JSON.stringify({
      Session: {
        SessionID: data.Item.SessionID,
        ToUserID: data.Item.FromUserID,
        SocketURL: "socket service not setup yet",
      }
    }, null, 2);
  }).catch((error) => {
    callback(new Error(`getSession failed, SessionID: ${sessionId}, error: ${error}`));
  });

  callback(null, response);
};

module.exports.closeSession = async (event, context, callback) => {
  const { sessionId } = event.pathParameters;

  const deleteItemCommand = new DeleteItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'SessionID': { S: sessionId }
    }
  });

  DynamoClient.send(deleteItemCommand).catch((error) => {
    callback(new Error(`deleteSession failed, SessionID: ${SessionID}, error: ${error}`));
  });

  const response = {
    statusCode: 200,
  };

  callback(null, response);
};