"use strict";
require('dotenv').config();
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
        let chatUser = new User(userChatInfo.id, userChatInfo.name, userChatInfo.socketId, userChatInfo.publicKey);
        users.push(chatUser);
        users.forEach(user => {
            console.log('-------');
            console.log('ID: ' + user.id);
            console.log('Name: ' + user.name);
            console.log('SocketID: ' + user.socketId);
        })
        if (!chatStarted) {
            chatStarted = true;
            chatHoster.id = userChatInfo.id;
            chatHoster.name = userChatInfo.name;
            chatHoster.socketId = userChatInfo.socketId;
            io.emit('notifyChatStarter', { name: userChatInfo.name, id: userChatInfo.id });
        }
        let chatStartInfo = {
            name: chatHoster.name,
            id: chatHoster.id,
            chatStatus: chatStarted,
            socketId: userChatInfo.socketId
        }
        await sendChatAck(chatStartInfo);
        io.emit('newUser', { name: userChatInfo.name, id: userChatInfo.id });

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
        // Número de usuários ainda conectados
        console.log('Usuários ainda conectados: ' + sockets.length);
        // Lista usuários conectados pelo socket
        console.log('++++++++++++++++');
        sockets.forEach(socket => {
            console.log(`SocketId: ${socket}`);
        })
        console.log('++++++++++++++++');
        // Remove da lista de users o usuário que acabou de sair
        for (let i = 0; i < users.length; i++) {
            if (users[i].socketId == socket.id) {
                await sendUserDisconnect(users[i]);
                users.splice(i, 1);
            }
        }

        // Se não tiver mais ninguém conectado, reinicializa o chat
        if (!sockets.length) {
            endChat();
        } else {
            // Caso ainda tenha usuário conectado, verifica se foi o hoster que saiu
            // caso tenha sido o hoster a sair, tem trocar
            if (chatHoster.socketId == socket.id) {
                // Confirmando que aind atem usuário ativo
                if (sockets.length && users.length) {
                    // Busca pelo novo hoster
                    let found = users.find((element) => {
                        return element.socketId == sockets[0];
                    })
                    // Se encontrar o novo hoster, coloca-o como hoster
                    if (found) {
                        chatHoster.id = found.id;
                        chatHoster.name = found.name;
                        chatHoster.socketId = found.socketId;
                        sendNewChatHoster(chatHoster);
                    } else {
                        // Caso não encontre, coloca o primeiro no array users
                        chatHoster.id = users[0].id;
                        chatHoster.name = users[0].name;
                        chatHoster.socketId = users[0].socketId;
                        sendNewChatHoster(chatHoster);
                    }

                } else {
                    // Se o sockets ou users estiver zerado, finaliza o chat
                    endChat()
                }
            }
        }
    })

    socket.on('typing', (id) => {
        io.emit('someTyping', id);
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

function endChat() {
    console.log('Chat encerrado');
    chatHoster.id = -1;
    chatHoster.name = '';
    chatHoster.socketId = '';
    chatStarted = false;
    users = [];
    if (idGeral >= 999999999) {
        idGeral = 0;
    }
}

var appPort = (process.env.PORT || 4444);
http.listen(appPort, () => {
    console.log(`Listen to the port ${appPort}`);
})

app.get('/', function (req, res) {
    res.send('plupchat-backend is f***ing alive!! Yayyy');
})