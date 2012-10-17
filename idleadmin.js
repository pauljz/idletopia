var IdleUser = require('./idleuser');

function IdleAdmin( bot ) {
	this.bot = bot;
}

IdleAdmin.prototype.process = function( nick, text, message ) {
	if ( text.match( /^register/i ) ) {
		this.register( nick, text, message );
	} else if ( text.match( /^login/i ) ) {
		this.login( nick, text, message );
	} else if ( text.match( /^removeme/i ) ) {
		this.removeme( nick, text, message );
	} else if ( text.match( /^logout/i ) ) {
		this.logout( nick, text, message );
	} else if ( text.match( /^newpass/i ) ) {
		this.newpass( nick, text, message );
	}
};

IdleAdmin.prototype.removeme = function( nick, text, message ) {
	if ( this.bot.users.hasOwnProperty(nick) && this.bot.users[nick].online === true ) {
		this.bot.client.say( nick, "Your account has been deleted." );
		this.bot.say( this.bot.users[nick].username + ' has abandoned their province.' );
		delete this.bot.users[nick];
	} else {
		this.bot.client.say( nick, "You need to be logged in to delete yourself." );
	}
};

IdleAdmin.prototype.newpass = function( nick, text, message ) {
	var passString = text.match( /^newpass (.+)$/i );

	if ( this.bot.users.hasOwnProperty(nick) && this.bot.users[nick].online === true ) {
		if ( !passString ) {
			this.bot.client.say( nick, "Password change failed. The format should be: NEWPASS new-password" );
			return;
		} else {
			this.bot.users[nick].password = this.bot.users[nick].hashPassword( passString[1] );
			this.bot.client.say( nick, "Password change succeeded!" );
		}
	} else {
		this.bot.client.say( nick, "You need to be logged in to change your password." );
	}
}

IdleAdmin.prototype.logout = function( nick, text, message ) {
	this.bot.runRule( 'logout', nick );
	this.bot.logout( nick );
};

IdleAdmin.prototype.login = function( nick, text, message ) {
	var user;
	var loginString = text.match( /^login ([^\s]+) ([^\s]+)$/i );

	if ( !loginString ) {
		this.bot.client.say( nick, "Login failed. The format should be: LOGIN username password" );
		return;
	}

	var username = loginString[1];
	var password = loginString[2];

	for ( var i in this.bot.users ) {
		user = this.bot.users[i];
		if ( user.username === username ) {
			if ( user.hashPassword( password ) === user.password ) {

				user.online = true;
				user.loggedOut = false;
				user.nick = nick;
				user.user = message.user;
				user.host = message.host;

				delete this.bot.users[i];
				this.bot.users[nick] = user;

				this.bot.say( user.getInfoLine() + ", is now online from the nickname " + nick );

			} else {
				this.bot.client.say( nick, "Login failed.  Might be using the wrong password." );
			}
			return;
		}
	}
	this.bot.client.say( nick, "Login failed.  Might be using the wrong username." );
}

IdleAdmin.prototype.register = function( nick, text, message ) {
	var user;
	var username, password;

	var regString = text.match( /^register ([^\s]+) ([^\s]+) (.*)$/i );
	if ( !regString ) {
		this.bot.client.say( nick, 'User registration should be of the form: REGISTER username password race' ); 
		this.bot.client.say( nick, 'Username, password, and race can be whatever you want!' ); 
		return;
	}

	if ( this.bot.checkUser(nick) && this.bot.users[nick].online === true ) {
		// Already online with this nickname.
		this.bot.client.say( nick, 'Looks like you\'re already online with this nickname.' ); 
		return;
	}

	username = regString[1];
	password = regString[2];
	charRace = regString[3];

	for ( var i in this.bot.users ) {
		if ( this.bot.users[i].username === username ) {
			this.bot.client.say( nick, 'A user already exists with this username! Please pick another.' ); 
			return;
		}
	}

	user = new IdleUser( username, password, charRace, nick, message.user, message.host );
	user.online = true;
	this.bot.users[nick] = user;

	this.bot.assignKingdom( user );
	this.bot.say( 'A new player, ' + user.getInfoLine(true) + ', has been granted ' + user.acres + ' acres by the Utopian Lords.' );
};

module.exports = IdleAdmin;
