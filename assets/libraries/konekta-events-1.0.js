$(document).ready(function () {

    var kcook = $.parseJSON(readCookie('konekta'));

    if(kcook != null){
        $(document).trigger('attach', kcook);
    }

    $("#log_button").click(function(){
        $('#jid').attr('disabled', 'disabled');
        $('#password').attr('disabled', 'disabled');
        $('#log_button').attr('disabled', 'disabled');
        $(document).trigger('connect', {
            jid: $('#jid').val()+'@konekta',
            password: $('#password').val()
        });
    });

    $("#reg_button").click(function(){
        if(validateRegister()){
            $(document).trigger('register', {
                jid: $('#rjid').val(),
                email: $('#email').val(),
                name: $('#name').val(),
                surname: $('#surname').val(),
                gender: $('#gender').val(),
                age: $('age').val(),
                password: $('#rpassword').val()
            });
        }
        else{
            console.log("Error validating register");
        }
    });

    $("#follow").click(function(){
        console.log("follow trigger!");
        $(document).trigger('contact_added', {
            jid: $('#follow-jid').val(),
        });
    });
});

$(window).bind('unload', function() {
    
    if(konekta.connection != null){
        konekta.connection.pause();
        var konn = {
            jid : konekta.connection.jid,
            sid : konekta.connection.sid,
            rid : konekta.connection.rid,
        }
        createCookie('konekta', JSON.stringify(konn), 5);
    } else {
        eraseCookie('konekta');
    }
    //$(document).trigger('disconnected');
});

$(document).bind('connect', function (ev, data) {
    console.log("trigger connect detected...");
    var conn = new Strophe.Connection(konekta.BOSH_SERVICE);

    conn.connect(data.jid, data.password, konekta.handleStropheStatus);

    konekta.connection = conn;
});


$(document).bind('attach', function (ev, data) {
    console.log("trigger attach detected... ");
    konekta.connection = new Strophe.Connection(konekta.BOSH_SERVICE);
    konekta.connection.attach(data.jid, data.sid, parseInt(data.rid,10), konekta.handleStropheStatus);
});


$(document).bind('register', function (ev, data) {
    console.log("trigger register detected...");
    var conn = new Strophe.Connection(konekta.BOSH_SERVICE);

    var callback = function(status) {
        if (status === Strophe.Status.REGISTER){
            conn.register.fields.username = data.jid;
            conn.register.fields.email = data.email;
            conn.register.fields.password = data.password;
            conn.register.fields.name = data.name;
            //conn.register.fields.surname = data.surname;
            //conn.register.fields.age = data.age;
            //conn.register.fields.gender = data.gender;
            conn.register.submit();
        } else if (status === Strophe.Status.REGISTERED) {
            console.log("registered!");
            $(document).trigger('connect', {
                jid: data.jid+'@konekta',
                password: data.password
            });
        } else if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else{
            $('#vusername').attr('style','display:block; color: red;');
        }
    };

    conn.register.connect("konekta", callback);
    konekta.connection = conn;
});

$(document).bind('connected', function () {
    // inform the user
    changeToMainSection();
    
    var iq = $iq({type:'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    konekta.connection.sendIQ(iq, konekta.on_roster);
    konekta.connection.addHandler(konekta.on_roster_changed, "jabber:iq:roster", "iq", "set");

    //Enable receiving messages
    konekta.connection.addHandler(konekta.on_message, null, 'message', null, null, null);
    konekta.connection.receipts.addReceiptHandler(konekta.on_receipt, null, null, null);
});

$(document).bind('authenticating', function () {
    konekta.log("Attempting to authenticate and create session...");
});

$(document).bind('connfail', function () {
    konekta.print("A problem has been encountered when trying to establish the connection");
});

$(document).bind('authfail', function () {
    konekta.print("An error ocurred during the authentication process");
});

$(document).bind('disconnected', function () {
    // remove dead connection object
    if(konekta.connection){
        konekta.connection.sync = true;
        konekta.connection.flush();
        konekta.connection.disconnect();
        konekta.connection=null;
    }
});

$(document).bind('contact_added', function (ev,data) {
    var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
        .c("item", data);
    konekta.connection.sendIQ(iq);

    var subscribe = $pres({to: data.jid, "type": "subscribe"});
    konekta.connection.send(subscribe);
});

function unfollow(jid){
    alert("You're going to unsubscribe "+jid);
    //konekta.connection.send($pres({to: konekta.pending_subscriber, "type": "subscribed"}));
}

function createCookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    } else var expires = "";
    document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
}

function readCookie(name) {
    var nameEQ = escape(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return unescape(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name, "", -1);
}