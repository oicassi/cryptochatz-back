"use strict";

const express = require('express')
const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const User = require('./models/user')
const cors = require('cors');
app.use(cors());
var i = 0;
var idGeral = 0;
var fucker = new User(1, 'Joanesio', '12345');
var users = []
var chatStarted = false;
var chatHoster = {
    id: -1,
    name: '',
    socketId: '',
}

const _self = this
io.on('connection', async (socket) => {
    // Procedimento ao realizar a conexão
    //let user = JSON.parse(socket.json.handshake.query.user);
    socket.on('connectionExtra', async (u) => {
        idGeral++;
        u.id = idGeral;
        u.socketId = socket.id;
        console.log(`User connected: Name: ${u.name} - ID: ${u.id} - PUBLIC KEY: ${u.publicKey} - SOCKET ID: ${u.socketId}`);
        let chatUser = new User(u.id, u.name, u.socketId, u.publicKey);
        users.push(chatUser);
        let sockets = Object.keys(io.sockets.connected);
        console.log(`Usuários conectados: ${sockets.length}`)
        sockets.forEach(socket => {
            console.log(`SocketId: ${socket}`);
        });
        await sendConnectAck(io, u);
        if (chatStarted) {
            let requestSymKeyInfo = {
                socketId: u.socketId,
                publicKey: u.publicKey,
                name: u.name,
                id: u.id
            }
            await requestSymKey(requestSymKeyInfo);
        }

    })

    // Procedimento ao iniciar um chat
    socket.on('startChat', async (userChatInfo) => {
        if (!chatStarted) {
            chatStarted = true;
            chatHoster.id = userChatInfo.id;
            chatHoster.name = userChatInfo.name;
            chatHoster.socketId = userChatInfo.socketId;
            io.emit('notifyChatStarter', {name: userChatInfo.name, id: userChatInfo.id});
        }
        let chatStartInfo = {
            name: chatHoster.name,
            id: chatHoster.id,
            chatStatus: chatStarted,
            socketId: userChatInfo.socketId
        }
        await sendChatAck(chatStartInfo);
        io.emit('newUser', {name: userChatInfo.name, id: userChatInfo.id});

    })

    socket.on('manualRequestSymKey', async (manualRequestSymKey) => {
        await requestSymKey(manualRequestSymKey);
    })

    socket.on('symKeyInfo', (symKeyInfo) => {
        io.sockets.connected[symKeyInfo.socketId].emit('symKey', symKeyInfo.symKey)
    })

    // Procedimento ao receber uma mensagem
    socket.on('message', (msg) => {
        io.emit('message', msg);
    })

    // Procedimento quando um usuário se desconecta
    socket.on('disconnect', async () => {
        console.log('Usuario desconectado - SocketId: ' + socket.id);
        let sockets = Object.keys(io.sockets.connected);
        console.log('Usuários ainda conectados: ' + sockets.length);
        sockets.forEach(socket => {
            console.log(`SocketId: ${socket}`);
        })

        if (!sockets.length) {
            console.log('Chat encerrado');
            chatHoster.id = -1;
            chatHoster.name = '';
            chatHoster.socketId = '';
            chatStarted = false;
            idGeral = 0;
        } else {
            for (let i = 0; i < users.length; i++) {
                if (users[i].socketId == socket.id) {
                    await sendUserDisconnect(users[i]);
                    users.splice(i, 1);
                }
            }
            if (chatHoster.socketId == socket.id) {
                // Novo chatHoster
                chatHoster.id = users[0].id;
                chatHoster.name = users[0].name;
                chatHoster.socketId = users[0].socketId;

                sendNewChatHoster(chatHoster);

            }
        }

    })
})

function sendConnectAck(io, s) {
    let info = {
        id: s.id,
        socketId: s.socketId,
    }
    console.log('Info sendo enviada: ' + info)
    io.sockets.connected[s.socketId].emit('connectAck', info);
}

function requestSymKey(requestSymKeyInfo) {
    io.sockets.connected[chatHoster.socketId].emit('requestSymKey', requestSymKeyInfo);
}

function sendChatAck(chatInfo) {
    io.sockets.connected[chatInfo.socketId].emit('startChatAck', chatInfo)
}

function sendUserDisconnect(userDisc) {
    io.emit('userLost', userDisc);
}

function sendNewChatHoster(newHosterInfo) {
    io.emit('newHost', newHosterInfo);
}

http.listen(4444, () => {
    console.log('Listen to the port 4444');
})