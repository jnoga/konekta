var konekta = {
    connection: null,
    start_time: null,
    pending_subscriber: null,

    print: function(msg){
    	$('#loging_log').append("<p>" + msg + "</p>");
    },

    log: function (msg) {
        //$('#log').append("<p>" + msg + "</p>");
        console.log(msg);
    },

    on_roster: function (iq) {
        console.log('roster: ');
        console.log(iq);
        $(iq).find('item').each(function () {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            // transform jid into an id
            var jid_id = konekta.jid_to_id(jid);
            var contact = $("<li id='" + jid_id + "' >" +
                        '<div class="roster-contact offline" onclick="openChat(\''+jid+'\');">' +
                        //onclick="openChat(\''+jid+'\');"
                        '<div class="roster-name">' + name + '</div>' +
                        //'<div class="roster-jid">' + jid + '</div></div>'+
                        //'<input type="button" value="Unfollow" class="unfollow" onclick="unfollow('+jid+');" />'+
                        '</li>');
            konekta.insert_contact(contact);
        });
        konekta.connection.addHandler(konekta.on_presence, null, "presence");
        konekta.connection.send($pres());
    },

    on_roster_changed: function(iq) {
        console.log('roster changed: ');
        console.log(iq);
        $(iq).find('item').each(function () {
            var sub = $(this).attr('subscription');
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var jid_id = konekta.jid_to_id(jid);

            if (sub === 'remove') {
                $('#' + jid_id).remove();
            } else {
                var contact_html = "<li id='" + jid_id + "'>" +
                "<div class='" +
                ($('#' + jid_id).attr('class') || "roster-contact offline") +
                //onclick='openChat("+jid+");'
                "' onclick='openChat(\""+jid+"\");'>" +
                "<div class='roster-name'>" + name + '</div>' +
                //"<div class='roster-jid'" + jid +"</div>" +
                "</div>"+
                //"<input type='button' value='Unfollow' class='unfollow' onclick='unfollow("+jid+")'/>" +
                "</li>";

                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                } else {
                    console.log(contact_html);
                    konekta.insert_contact(contact_html);
                }
            }

        });

        return true;
    },

    on_presence: function (presence) {

        var ptype = $(presence).attr('type');
        var from = $(presence).attr('from');
        console.log(presence)

        if (ptype === 'subscribe') {
            console.log("request from: " + from);
            konekta.pending_subscriber = from;
            //Automatically accept subscriptions
            konekta.connection.send($pres({to: konekta.pending_subscriber, "type": "subscribed"}));
            konekta.pending_subscriber = null;
        } else if (ptype !== 'error') {
            var contact = $('#roster-area li#' + konekta.jid_to_id(from) + ' .roster-contact')
                .removeClass('online')
                .removeClass('away')
                .removeClass('offline');

            if (ptype === 'unavailable') {
                contact.addClass('offline');
            } else {
                var show = $(presence).find('show').text();
                if (show === '' || show === 'chat') {
                    contact.addClass('online');
                } else {
                    contact.addClass('away');
                }
            }
            var li = contact.parent();
            li.remove();
            konekta.insert_contact(li);
        }
        return true;
    },

    jid_to_id: function (jid) {
        return Strophe.getBareJidFromJid(jid)
            .replace("@", "-")
            .replace(".", "-");
    },

    presence_value: function (elem) {
        if (elem.hasClass('online')){
            return 2;
        } else if (elem.hasClass('away')) {
            return 1;
        }
        return 0;
    },

    insert_contact: function (elem) {
        //console.log(elem.html());
        var jid = elem.find('.roster-jid').text();
        var pres = konekta.presence_value(elem.find('.roster-contact'));
        //console.log(jid+"/"+pres);
        var contacts = $('#roster-area li');

        if (contacts.length > 0) {
            var inserted = false;
            contacts.each(function (){
                var cmp_pres = konekta.presence_value(
                    $(this).find('.roster-contact'));
                var cmp_jid = $(this).find('.roster-jid').text();

                if (pres > cmp_pres) {
                    $(this).before(elem);
                    inserted = true;
                    return false;
                } else {
                    if (jid < cmp_jid) {
                        $(this).before(elem);
                        inserted = true;
                        return false;
                    }
                }

            });

            if (!inserted) {
                $('#roster-area ul').append(elem);
            }

        } else {
            $('#roster-area ul').append(elem);
        }
    },

    on_message: function(message) {
        var jid = Strophe.getBareJidFromJid($(message).attr('from'));
        var jid_id = konekta.jid_to_id(jid);
        console.log("message from: " + jid +"/" + jid_id);
        //Create new chat element if doesn't exists
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
            $('#chat-' + jid_id).append(
                "<div class='msgs'></div>" +
                "<footer><input type='text' id='i"+jid_id+"' onKeyPress='return enter(this,event,\""+jid_id+"\", \""+jid+"\")' class='roster-input'>");
            $('#chat-' + jid_id).data('jid', jid);
        }
        //Show/focus on the users chat
        $(".chat").each(function( index ){
            $(this).attr('style','display:none;');
        });
        $('#chat-'+ jid_id).attr('style','display:block;');
        $('#chat-' + jid_id + ' input').focus();
        //Print the message
        var body = $(message).find("html > body");
        if (body.length === 0) {
            body = $(message).find('body');
            if (body.length > 0) {
                body = body.text()
            } else {
                body = null;
            }
        } else {
            body = body.contents();
            var span = $("<span></span>");
            body.each(function () {
                if (document.importNode) {
                    $(document.importNode(this, true)).appendTo(span);
                } else {
                    // IE workaround
                    span.append(this.xml);
                }
            });
            body = span;
        }
        if (body) {
            // add the new message
            if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('left')){
                $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><p>"+body+"</p>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id).height());
            }
            else{
                $('#chat-' + jid_id + ' .msgs').append("<div class='msg left'><p>"+body+"</p></div>");
            }
        }
        return true;
    },

    scroll_chat: function (jid_id) {
        scroll(jid_id);
    }
};

$(document).ready(function () {
    $("#log_button").click(function(){
        $('#jid').attr('disabled', 'disabled');
        $('#password').attr('disabled', 'disabled');
        $('#log_button').attr('disabled', 'disabled');
        $(document).trigger('connect', {
            jid: $('#jid').val(),
            password: $('#password').val()
        });
    });

    $("#reg_button").click(function(){
        var callback = function(status) {
            if (status === Strophe.Status.REGISTER){
                connection.register.fields.username= "";
                connection.register.fields.password = "";
                connection.register.fields.email = "";
                connection.register.submit();
            } else if (status === Strophe.Status.REGISTERED) {
                console.log("registered!");
                connection.authenticate();
            } else if (status === Strophe.Status.CONNECTED) {
                console.log("logged in!");
            } else {
                console.log("...");
            }
        };
        connection.register.connect
    });

    $("#follow").click(function(){
        console.log("follow trigger!");
        $(document).trigger('contact_added', {
            jid: $('#follow-jid').val(),
        });
    });
});

window.onbeforeunload = function(){alert("you just tried to leave the page");};

$(window).unload(function() {
    $(document).trigger('disconnected');
    alert("Are you sure?");
});

$(document).bind('connect', function (ev, data) {
    console.log("trigger connect detected...");

    var conn = new Strophe.Connection(
        "http://5.39.83.108:7070/http-bind/");

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

$(document).bind('register', function(ev, data) {
    console.log("trigger register detected...");

    var connection = new Strophe.Connection(
        "http://10.92.12.178:7070/http-bind/");

    var callback = function(status) {
        if (status === Strophe.Status.REGISTER){
            connection.register.fields.username= "";
            connection.register.fields.password = "";
            connection.register.fields.email = "";
            connection.register.submit();
        } else if (status === Strophe.Status.REGISTERED) {
            console.log("registered!");
            connection.authenticate();
        } else if (status === Strophe.Status.CONNECTED) {
            console.log("logged in!");
        } else {
            console.log("...");
        }
    };

    connection.register.connect("localhost", callback);
});

$(document).bind('connected', function () {
    // inform the user
    konekta.log("Connection established.");

    var iq = $iq({type:'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    konekta.connection.sendIQ(iq, konekta.on_roster);
    konekta.connection.addHandler(konekta.on_roster_changed, "jabber:iq:roster", "iq", "set");

    //Enable receiving messages
    konekta.connection.addHandler(konekta.on_message, null, 'message', null, null, null);

    changeSection();

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
    konekta.log("Connection terminated.");

    // remove dead connection object
    konekta.connection = null;
});

$(document).bind('contact_added', function (ev,data) {
    var iq = $iq({type: "set"}).c("query", {xmlns: "jabber:iq:roster"})
        .c("item", data);
    konekta.connection.sendIQ(iq);

    var subscribe = $pres({to: data.jid, "type": "subscribe"});
    konekta.connection.send(subscribe);
});

function openChat(jid){
    var jid_id = konekta.jid_to_id(jid);
    var name = $('#' + jid_id).find(".roster-name").text();
    //Open the user chat...
    if ($('#chat-' + jid_id).length === 0) {
        $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
        $('#chat-' + jid_id).append(
            "<div class='msgs'></div>" +
            "<footer><input type='text' id='i"+jid_id+"' class='roster-input'>" +
            "<span onclick='sendMsg(\""+jid_id+"\", \""+jid+"\");' id='iconSend-"+jid+"+'>&#9998;</footer>");
        $('#chat-' + jid_id).data('jid', jid);
    }
    //Show/focus on the users chat
    $(".chat").each(function( index ){
        $(this).attr('style','display:none;');
    });
    $('#chat-'+ jid_id).attr('style','display:block;');
    $('#chat-' + jid_id + ' input').focus();
}

function sendMsg(jid_id, jid) {
    //var elem = document.getElementById(id);
    var elem = $("#i"+jid_id);

    if(elem.val() != ""){
        konekta.connection.send($msg({
            to: jid,
            "type": "chat"
        }).c('body').t(elem.val()));

        if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('right')){
            $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><p>"+elem.val()+"</p>");
            $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id).height());
        }
        else{
            $('#chat-' + jid_id + ' .msgs').append("<div class='msg right'><p>"+elem.val()+"</p></div>");
        }
        elem.val('');
        $("#chat-"+jid_id+" #msgs").attr({ scrollTop: $("#chat-"+jid_id+" #msgs").attr("scrollHeight") });
        $("#chat-"+jid_id).scrollTop($("#chat-"+jid_id).height());
    }
}

function unfollow(jid){
    alert("You're going to unsubscribe "+jid);
    //konekta.connection.send($pres({to: konekta.pending_subscriber, "type": "subscribed"}));
}

function changeSection(){
    $("#login-section").attr("style","display:none;");
    $("#main-section").attr("style","display:block;");
}

function menuShow(){
    document.getElementById('main-section').className ='menuShow';
    $('#iconMenu').attr('onclick', 'menuHide()');
    $('#menu-konekta').css('z-index', '0');
}

function menuHide(){
    document.getElementById('main-section').className ='menuHide';
    $('#iconMenu').attr('onclick', 'menuShow()');
    $('#menu-konekta').css('z-index', '-1');
}

function enter(myfield,e,o){
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13){
        sendMsg(o);
        return false;
    }
    else
        return true;
}
