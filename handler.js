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
      SessionID: sessionId,
      FromUserID: UserId,
      // socket url
    },
  });

  DynamoClient.send(putSessionItemCommand).catch((error) => {
    return callback(new Error(`createSession failed, userId: ${userId}, error: ${error}`));
  });

  const response = {
    statusCode: 200,
    body: JSON.stringify(
      {
        SessionID: sessionId
      },
      null,
      2
    )
  }

  return callback(null, response);
};

module.exports.getSession = async (event, context, callback) => {
  const { SessionID } = event.PathParameters;

  const getItemCommand = GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      SessionID: { S: SessionID }
    }
  });

  const response = {};

  DynamoClient.send(getItemCommand).then((data) => {
    response.body = JSON.stringify({
      Session: {
        SessionID: data.Item.SessionID,
        ToUserID: data.Item.FromUserID,
        SocketURL: "socket service not setup yet",
      }
    }, null, 2);
  }).catch((error) => {
    return callback(new Error(`getSession failed, SessionID: ${SessionID}, error: ${error}`));
  });

  return callback(null, response);
};

module.exports.closeSession = async (event, context, callback) => {
  const { SessionID } = event.PathParameters;

  const deleteItemCommand = DeleteItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      'SessionID': { S: SessionID }
    }
  });

  DynamoClient.send(deleteItemCommand).catch((error) => {
    return callback(new Error(`deleteSession failed, SessionID: ${SessionID}, error: ${error}`));
  });

  const response = {
    statusCode: 200,
  };

  return callback(null, response);
};