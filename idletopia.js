var util   = require('util')
  , fs     = require('fs')
  , events = require('events')
  , IdleAdmin = require('./idleadmin')
  , IdleUser = require('./idleuser');

var Idletopia = function(options) {
	var irc = require('irc');
	var _this = this;

	this.admin = new IdleAdmin(this);
	this.admins = [ 'arc', 'Paul' ];

	this.rules = require('./rules');

	this.hostileMeter = {};

	// option defaults
	this.options = {
		tickLength: 5,
		autojoin: true,
		version: 'idletopia-node-0.0.1',
	};
	for ( var prop in options ) {
		this.options[prop] = options[prop];
	}

	// In the case of a @#channel or +@#channel type PRIVMSG, this will still match:
	this.channelMatch = new RegExp( this.options.channel + '$', 'i' );

	this.users = {};

	this.client = new irc.Client( this.options.server, this.options.nickname, {
		port: 6667,
		userName: this.options.userName || 'idletopia',
		realName: this.options.realName || 'idletopia',
		showErrors: true,
		autoConnect: false,
	});

	console.time( 'Idletopia-connecting' );
	this.client.connect( 1, function() {
		if ( _this.options.autojoin ) {
			_this.client.join( _this.options.channel );
		}

		_this.loadState();

		_this.tickInterval = setInterval( function() {
			_this.tick.apply(_this);
		}, _this.options.tickLength * 1000 );

		_this.emit( 'connect' );

		console.timeEnd( 'Idletopia-connecting' );
	});

	//
	// Attach IRC event listeners that yield penalties
	//
	this.client.on( 'action', function( nick, to, text, message ) {
		if ( to.match( _this.channelMatch ) ) {
			_this.runRule( 'action', nick, text );
		}
	});
	this.client.on( 'message', function( nick, to, text, message ) {
		if ( to.match( _this.channelMatch ) ) {
			_this.runRule( 'message', nick, text );
		}
	});
	this.client.on( 'notice', function( nick, to, text, message ) {
		if ( to.match( _this.channelMatch ) ) {
			_this.runRule( 'notice', nick, text );
		}
	});
	this.client.on( 'nick', function( oldnick, newnick, channels, message ) {
		_this.changeNick( oldnick, newnick );
		_this.runRule( 'nick', newnick );
	});
	this.client.on( 'part' + this.options.channel, function( nick, reason, message ) {
		_this.runRule( 'part', nick );
		_this.logout( nick );
	});
	this.client.on( 'kick' + this.options.channel, function( nick, by, reason, message ) {
		_this.runRule( 'kick', nick );
		_this.logout( nick );
	});
	this.client.on( 'quit', function( nick, reason, channels, message ) {
		_this.runRule( 'quit', nick );
		_this.logout( nick );
	});

	//
	// Admin/registration functions
	//
	this.client.on( 'pm', function( nick, text, message ) {
		if ( _this.checkAdmin(nick) && text === 'reload' ) {
			_this.reload();
		} else {
			_this.admin.process( nick, text, message );
		}
	});

	//
	// Utility handlers
	//
	this.client.on( 'ctcp-version', function( from, to ) {
		_this.client.ctcp( from, 'notice', 'VERSION ' + version );
	});
	this.client.on( 'error', function() {
		console.log( arguments );
	});

	var autoLoggedIn = [];
	this.client.on( 'raw', function( message ) {
		var nick;
		if ( message.rawCommand === '352' ) {
			if ( message.args[1] === _this.options.channel ) {
				for ( nick in _this.users ) {
					if (
						_this.users[nick].nick === message.args[5] &&
						_this.users[nick].user === message.args[2] &&
						_this.users[nick].host === message.args[3] &&
						_this.users[nick].loggedOut === false
					) {
						_this.users[nick].online = true;
						autoLoggedIn.push( nick );
						break;
					}
				}
			}
		} else if ( message.rawCommand === '315' ) {
			_this.autoLoggingIn = false;
			_this.say( 'Auto-login complete for users: ' + autoLoggedIn.join(', ') );
		}
	});
};
util.inherits( Idletopia, events.EventEmitter );

Idletopia.prototype.say = function( message ) {
	this.client.say( this.options.channel, message );
};

Idletopia.prototype.assignKingdom = function(user) {
	var kingdoms = {};
	var smallest = '1:1';
	var userCount = 0;
	var kingdomCount = 0;
	for ( var nick in this.users ) {
		userCount++;
		if ( this.users[nick].kingdom ) {
			if ( typeof kingdoms[ this.users[nick].kingdom ] === 'undefined' ) {
				kingdoms[ this.users[nick].kingdom ] = 1;
				kingdomCount++;
			} else {
				kingdoms[ this.users[nick].kingdom ]++;
			}
			smallest = this.users[nick].kingdom;
		}
	}
	for ( var kd in kingdoms ) {
		if ( kingdoms[kd] < kingdoms[smallest] ) {
			smallest = kd;
		}
	}

	if ( kingdomCount < this.rules.minKingdoms( userCount ) ) {
		user.kingdom = this.createNewKingdom();
		this.say( user.username + ' has founded the kingdom of ' + user.kingdom );
	} else {
		user.kingdom = smallest;
		this.say( user.username + ' has joined the kingdom of ' + smallest );
	}
};

Idletopia.prototype.createNewKingdom = function() {
	var kingdoms = {};
	for ( var nick in this.users ) {
		if ( this.users[nick].kingdom ) {
			kingdoms[this.users[nick].kingdom] = true;
		}
	}
	var kdCount = 0;
	for ( kd in kingdoms ) {
		kdCount++;
	}

	return this.rules.newKingdom( kdCount );
};

Idletopia.prototype.tick = function() {
	var user, users, target;

	// Tick users
	users = this.users;
	for ( var nick in users ) {
		user = users[nick];

		if ( !users[nick].kingdom ) {
			this.assignKingdom( users[nick] );
		}
		user.tick( this );
	}

	this.saveState();

};

Idletopia.prototype.getRandomTarget = function( forUser ) {
	var result;
	var nicks = Object.getOwnPropertyNames( this.users );
	var iter = 0;
	var selected;
	var found = false;
	while( !found ) {
		selected = nicks[ Math.floor( Math.random() * nicks.length ) ];
		if ( this.users[selected].kingdom !== forUser.kingdom ) {
			found = true;
		} else {
			iter++;
			if ( iter > 10 ) {
				break;
			}
		}
	}
	return this.users[ selected ];
};

Idletopia.prototype.saveState = function() {
	try {
		fs.rename( 'users.json', 'users-last.json' );
		fs.writeFile( 'users.json', JSON.stringify( this.users ), function(err) {
			if ( err ) {
				console.log(err);
			}
		});
	} catch( err ) {
		console.log(err);
	}
}

Idletopia.prototype.loadState = function() {
	var usersJSON, userHash, user, nick, prop;

	// Restore users uses syncronous operations.
	// This is okay here, since this should only be happening on boot, or in unusual circumstances

	try {
		if ( fs.existsSync( 'users.json' ) ) {
			usersJSON = fs.readFileSync( 'users.json', 'utf8' );
		} else if ( fs.existsSync( 'users-last.json' ) ) {
			usersJSON = fs.readFileSync( 'users-last.json', 'utf8' );
		} else {
			console.log( "No users file available." );
			return;
		}
	} catch( err ) {
		console.log(err);
	}

	userHash = JSON.parse( usersJSON );
	for ( nick in userHash ) {
		user = new IdleUser();
		for ( prop in userHash[nick] ) {
			user[prop] = userHash[nick][prop];
		}
		user.online = false;

		this.users[nick] = user;
	}

	this.autoLoggingIn = true;
	this.client.send( 'WHO', this.options.channel );
};

Idletopia.prototype.runRule = function( rule, nick, message ) {
	if ( !this.checkUser(nick) ) {
		return;
	}
	var user = this.users[nick];
	var penalty = this.rules[ rule + 'Penalty' ]( user, message );

	user.applyPenalty( this, rule, penalty );
}

Idletopia.prototype.logout = function(nick) {
	if ( this.checkUser(nick) ) {
		this.users[nick].logout();
	}
};

Idletopia.prototype.changeNick = function( oldnick, newnick ) {
	if ( !this.checkUser(oldnick) ) {
		return;
	}
	this.users[newnick] = this.users[oldnick];
	delete this.users[oldnick];
	this.users[newnick].changeNick( newnick );
};

Idletopia.prototype.checkUser = function(nick) {
	return this.users.hasOwnProperty(nick);
};

Idletopia.prototype.checkAdmin = function(nick) {
	return ( this.admins.indexOf( nick ) !== -1 );
};

Idletopia.prototype.reload = function() {
	delete require.cache[ require.resolve( './rules' ) ];
	delete require.cache[ require.resolve( './idleadmin' ) ];

	IdleAdmin = require('./idleadmin');
	this.admin = new IdleAdmin(this);

	this.rules = require('./rules');

	console.log( 'Reloaded rules, admin' );
};

module.exports = Idletopia;
