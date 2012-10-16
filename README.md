Idletopia
=========

Idletopia is a clone/variant of [IdleRPG](http://idlerpg.net/) with themes from the browser game [Utopia](http://utopia-game.com).

It's an IRC bot that sits in a channel and penalizes players for talking or interacting, and similarly rewards them for doing nothing.

I wrote this mainly to try to keep more users "active" on an IRC network that I've helped run for a long time, [UtoNet](irc://irc.utonet.org). Obviously they're not talking in the Idletopia channel, but it gives people a reason to stay on the network, when they otherwise might sign off throughout the day.


IRC module documentation
------------------------
[node-irc](https://node-irc.readthedocs.org/en/latest/API.html#client) - largely for my own reference


npm modules
-----------
* express
* irc
* jade
* marked

Thanks to @martynsmith for the [node-irc](https://github.com/martynsmith/node-irc) library especially,
which made this trivially easy and quick to implement.
I wouldn't have bothered at all with this project if his library hadn't been around.
