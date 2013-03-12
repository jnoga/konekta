var konekta = {
    BOSH_SERVICE: 'http://http://5.39.83.108:7070/http-bind/',
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

    handleStropheStatus: function(status) {
        if (status === Strophe.Status.CONNECTED) {
            $(document).trigger('connected');
        } else if (status === Strophe.Status.AUTHENTICATING) {
            $(document).trigger('authenticating');
        } else if (status === Strophe.Status.CONNFAIL) {
            $(document).trigger('connfail');
        } else if (status === Strophe.Status.AUTHFAIL) {
            $(document).trigger('authfail');
        } else if (status === Strophe.Status.DISCONNECTED) {
            console.log('disconnected');
            $(document).trigger('disconnected');
        } else if (status === Strophe.Status.ATTACHED) {
            console.log('session attached.');
            $(document).trigger('connected');
        } else if (status === Strophe.Status.DISCONNECTING){
            console.log('status: DISCONNECTING');
        } else if (status === Strophe.Status.ERROR){
            console.log('status: ERROR');
        }

        return true;
    },

    on_receipt: function(msg){
        console.log(msg);
        var item = $(msg).find('received')
        var id = item.attr("id");
        $("#"+id+" .check").append("&#10003;");
        return true;
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
                        '<div class="roster-contact offline" onclick="konekta.openChat(\''+jid+'\');">' +
                        '<div class="roster-name">' + name +
                        " <div id='um-"+jid_id+"' style='display: inline-block;'></div>"+
                        '</div>' +
                        //'<div class="roster-jid">' + jid + '</div></div>'+
                        '</div>'+
                        '</li>');
            contact.data('um', 0);
            contact.data('jid', jid);
            konekta.insert_contact(contact);
        });
        konekta.connection.addHandler(konekta.on_presence, null, "presence");
        konekta.load_chats();
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
                var contact_html = $("<li id='" + jid_id + "'>" +
                "<div class='" + ($('#' + jid_id).attr('class') || "roster-contact offline") +
                "' onclick='konekta.openChat(\""+jid+"\");'>" +
                "<div class='roster-name'>" + name + 
                " <div id='um-"+jid_id+"' style='display: inline-block;'></div>"+
                '</div>' +
                //"<div class='roster-jid'" + jid +"</div>" +
                "</div>"+
                "</li>");
                if ($('#' + jid_id).length > 0) {
                    $('#' + jid_id).replaceWith(contact_html);
                    $('#' + jid_id).data('um', ($('#' + jid_id).data('um') || 0));
                    $('#' + jid_id).data('jid', jid);
                } else {
                    console.log(contact_html);
                    contact_html.data('um', 0);
                    contact_html.data('jid', jid);
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
                if($('#chat-' + konekta.jid_to_id(from)).length > 0){
                        $('#la-' + konekta.jid_to_id(from)).text(parseDate(new Date()));
                    }
            } else {
                var show = $(presence).find('show').text();
                if (show === '' || show === 'chat') {
                    contact.addClass('online');
                    if($('#chat-' + konekta.jid_to_id(from)).length > 0){
                        $('#la-' + konekta.jid_to_id(from)).text('Online');
                    }
                } else {
                    contact.addClass('away');
                    if($('#chat-' + konekta.jid_to_id(from)).length > 0){
                        $('#la-' + konekta.jid_to_id(from)).text('Away');
                    }
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
        var date = new Date($(message).attr('stamp'));

        var jid_id = konekta.jid_to_id(jid);
        console.log("message from: " + jid +"/" + jid_id);
        //Create new chat element if doesn't exists
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
            $('#chat-' + jid_id).append(
                "<header><div onclick='home();' id='iconMenu'>&#8962;</div><h1>"+jid+" <div class='lastact' id='la-"+jid_id+"'></div></h1></header>" +
                "<div class='msgs'></div>" +
                "<footer><input type='text' id='i"+jid_id+"' onKeyPress='return konekta.enter(this,event,\""+jid_id+"\", \""+jid+"\")' class='roster-input'></footer>");
            $('#chat-' + jid_id).data('jid', jid);
        }

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
            var d_string = date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
            if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('left')){
                $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><div class='hora'>"+d_string+"</div><p>"+body+"</p>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
            }
            else{
                $('#chat-' + jid_id + ' .msgs').append("<div class='msg left'><div class='hora'>"+d_string+"</div><p>"+body+"</p></div>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
            }
        }
        
        //show number of unread messages in roster
        var um = $('#'+ jid_id).data('um');
        if(!um) um = 0;
        if($('#chat-'+ jid_id).attr('style') === 'display:block;'){
            um = 0;
        }
        else{
            um++;
        }
        $('#'+ jid_id).data('um', um);
        $('#um-'+ jid_id).text((um === 0)?'':'('+um+')');

        return true;
    },

    scroll_chat: function (jid_id) {
        scroll(jid_id);
    },

    contact_status: function (iq) {
        console.log(iq)
        var from = $(iq).attr('from');
        var jid_id = konekta.jid_to_id(from);
        var last = $($(iq).find('query')).attr('seconds');
        var value = '';

        if(last === '0'){
            $('#la-' + jid_id).text('Online');
        }
        else{
            value = parseSeconds(last);
            $('#la-' + jid_id).text(value);
        }

        return true;
    },

    openChat: function (jid){
        var jid_id = konekta.jid_to_id(jid);
        var name = $('#' + jid_id).find(".roster-name").text();
        
        //Open the user chat...
        if ($('#chat-' + jid_id).length === 0) {
            $('#chat-area').append('<article class="chat" id="chat-'+jid_id+'"></article>');
            $('#chat-' + jid_id).append(
                "<header><div onclick='home();' id='iconMenu'>&#8962;</div><h1>"+name+"  <div class='lastact' id='la-"+jid_id+"'></div></h1></header>" +
                "<div class='msgs'></div>" +
                "<footer><input type='text' id='i"+jid_id+"' onKeyPress='return konekta.enter(this,event,\""+jid_id+"\", \""+jid+"\")' class='roster-input'></footer>");
            $('#chat-' + jid_id).data('jid', jid);
        }
        //Show/focus on the users chat
        $("#chat-area").attr('style', 'display: block;');
        $(".chat").each(function( index ){
            $(this).attr('style','display:none;');
        });
        $("#home").attr('style', 'display: none;');
        $('#chat-'+ jid_id).attr('style','display:block;');
        $('#chat-' + jid_id + ' input').focus();
        $('#'+ jid_id).data('um', 0);
        $('#um-'+ jid_id).text('');

        var iq = $iq({type:'get', to: jid}).c('query', {xmlns: 'jabber:iq:last'});
        konekta.connection.sendIQ(iq, konekta.contact_status);
    },

    sendMsg: function (jid_id, jid) {
        //var elem = document.getElementById(id);
        var elem = $("#i"+jid_id);

        if(elem.val() !== ""){
            var date = new Date();
            var msg = $msg({
                to: jid,
                "type": "chat",
                "stamp": date,
            }).c('body').t(elem.val());

            //konekta.connection.send(msg);
            if(!konekta.connection){
                konekta.connection.send($pres());
            }
            var mid = konekta.connection.receipts.sendMessage(msg);
            var d_string = date.getHours()+":"+(date.getMinutes()<10?'0':'') + date.getMinutes();
            if($('#chat-' + jid_id + ' .msgs div:last-child').hasClass('right')){
                $('#chat-' + jid_id + ' .msgs div:last-child').append("<hr/><div id='"+mid+"' class='hora'>"+d_string+"<span class='check'>&#10003;</span></div><p>"+elem.val()+"</p>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
            }
            else{
                $('#chat-' + jid_id + ' .msgs').append("<div class='msg right'><div id='"+mid+"' class='hora'>"+d_string+"<span class='check'>&#10003;</span></div><p>"+elem.val()+"</p></div>");
                $('#chat-' + jid_id).scrollTop($('#chat-' + jid_id + ' .msgs').height());
            }
            elem.val('');
        }
    },

    enter: function (myfield,e,a,b){
        var keycode;
        if (window.event) keycode = window.event.keyCode;
        else if (e) keycode = e.which;
        else return true;

        if (keycode == 13){
            konekta.sendMsg(a,b);
            return false;
        }
        else
            return true;
    },

    load_chats: function (){
        $('div#roster-area li').each(function(){
            var jid = $(this).data('jid');
            console.log('ask for chat archive: ' + jid);
        });

        return true;
    }
};
