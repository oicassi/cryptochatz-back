'use strict'
class User {
    id;
    name;
    socketId;
    publicKey;
    constructor(id, name, socketId, publicKey) {
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        this.publicKey = publicKey;
    }
    set id(id) {
        this.id = id;
    }
    get id() {
        return this.id;
    }
    set name(name) {
        this.name = name
    }
    get name() {
        return this.name;
    }
    set socketId(socketId) {
        this.socketId = socketId;
    }
    get socketId() {
        return this.socketId;
    }
    set publicKey(publicKey) {
        this.publicKey = publicKey;
    }
    get publicKey() {
        return this.publicKey;
    }
}
module.exports = User