$(document).ready(function () {
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



// window.onbeforeunload = function(){
//     return " ";
// };

// $(window).on('beforeunload', function() {

//     return "Are you shure?";

// });

// $(window).unload(function() {
//     console.log("cerrando sesión")
//     $(document).trigger('disconnected');
// });

$(document).bind('connect', function (ev, data) {
    console.log("trigger connect detected...");
    var conn = new Strophe.Connection(
        "http://localhost:7070/http-bind/");

    conn.connect(data.jid, data.password, function (status) {

        if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else if (status === Strophe.Status.AUTHENTICATING) {
            $(document).trigger('authenticating');
        } else if (status === Strophe.Status.CONNFAIL) {
            $(document).trigger('connfail');
        } else if (status === Strophe.Status.AUTHFAIL) {
            $(document).trigger('authfail');
        } else if (status === Strophe.Status.DISCONNECTED) {
            $(document).trigger('disconnected');
        }
    });

    konekta.connection = conn;
});

$(document).bind('register', function (ev, data) {
    console.log("trigger register detected...");
    var conn = new Strophe.Connection(
        "http://localhost:7070/http-bind/");

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
    konekta.log("Connection established.");
    changeToMainSection();

    // var u = $('#jid').val();
    // var p = $('#password').val();
    // console.log("u"+u);
    // console.log("p"+p);
    // setCookie("username", u, 365);
    // setCookie("password", p, 365);


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
    // konekta.connection.send($pres({"type":"unavailable"}));
    if(konekta.connection){
        konekta.connection.sync = true;
        konekta.connection.flush();
        konekta.connection.disconnect();
        konekta.connection=null;
        konekta.log("Connection terminated.");
        var username=getCookie("username");
        var contra=getCookie("password");
        $(document).trigger('connect', {
            jid: username,
            password: contra
        });
        console.log(konekta.connection);
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



function getCookie(c_name) {
    var i,x,y,ARRcookies=document.cookie.split(";");

    for (i=0;i<ARRcookies.length;i++) {
        x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
        y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
        x=x.replace(/^\s+|\s+$/g,"");

        if (x==c_name) {
            return unescape(y);
        }
    }
}

function setCookie(c_name,value,exdays) {
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=c_name + "=" + c_value;
}

function checkCookie() {
    var username=getCookie("username");
    var contra=getCookie("password");
    if (username!=null && username!="") {
        console.log("Welcome again " + username + "pass: "+ contra );
        console.log("volviendo a logear espera...");
        console.log(konekta.connection);
        $(document).trigger('connect', {
            jid: username,
            password: contra
        });

        console.log(konekta.connection);
    }
    else {
        console.log("logeate");
    }
}