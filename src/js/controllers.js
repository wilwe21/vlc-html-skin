var currentArt = null;
var current_que = 'main';
var current_playlist_id = -1;
var previous_playlist_id = -1;
var seek_sec = 0;

function updateArt(url) {
    $('#albumArt').fadeOut(0, function () {
        $(this).addClass('hidden').removeAttr('height').removeAttr('width').attr('src', url);
    });
}

function updateStatus() {
    $.ajax({
        url: 'requests/status.xml',
        success: function (data, status, jqXHR) {
            if (current_que == 'main') {
                $('.dynamic').empty();
                $('#mediaTitle').append($('[name="title"]', data).text());
				$('#mediaArtist').append($('[name="artist"]', data).text());
                $('#mediaTitle2').append($('[name="title"]', data).text());
				$('#mediaArtist2').append($('[name="artist"]', data).text());
                $('#totalTime').append(format_time($('length', data).text()));
                $('#currentTime').append(format_time($('time', data).text()));
                if (!$('#progress-bar').data('clicked')) {
                    let v = toFloat($('position', data).text()) * 100
					$("#progress-bar").css({"background": `linear-gradient(to right, #c6a0f6 0%, #c6a0f6 ${v}%, #494d64 ${v}%, #494d64 100%)`})
                }
                $('#currentVolume').append(Math.round($('volume', data).text() / 2.56) + '%');
                /* Don't interfere with the user's action */
                if (!$('#volumeSlider').data('clicked')) {
                    $('#volumeSlider').slider({
                        value: ($('volume', data).text() / 5.12)
                    });
                }
                $('#rateSlider').slider({
                    value: ($('rate', data).text())
                });
                $('#currentRate').append(Math.round($('rate', data).text() * 100) / 100 + 'x');
                $('#audioSlider').slider({
                    value: ($('audiodelay', data).text())
                });
                $('#currentAudioDelay').append(Math.round($('audiodelay', data).text() * 100) / 100 + 's');
                $('#subtitleSlider').slider({
                    value: ($('subtitledelay', data).text())
                });
                $('#currentSubtitleDelay').append(Math.round($('subtitledelay', data).text() * 100) / 100 + 's');
                $('#progress-bar').attr('totalLength', $('length', data).text());
                $('#buttonPlay').attr('state', $('state', data).text()).attr('mrl', $('[name="filename"]', data).text());
                $('#buttonPlay2').attr('state', $('state', data).text()).attr('mrl', $('[name="filename"]', data).text());
                if ($('state', data).text() == 'playing') {
                    $('#main-play-icon').removeClass('fa-play').addClass('fa-pause');
                    $('#footer-play-icon').removeClass('fa-play').addClass('fa-pause');
                } else {
                    $('#main-play-icon').removeClass('fa-pause').addClass('fa-play');
                    $('#footer-play-icon').removeClass('fa-pause').addClass('fa-play');
                }
                if ($('random', data).text() == 'true') {
                    $('#buttonShuffle').removeClass('ui-state-default').addClass('ui-state-active');
                } else {
                    $('#buttonShuffle').addClass('ui-state-default').removeClass('ui-state-active');
                }
                if ($('loop', data).text() == 'true') {
                    $('#buttonLoop').removeClass('ui-state-default').addClass('ui-state-active');
                } else {
                    $('#buttonLoop').addClass('ui-state-default').removeClass('ui-state-active');
                }
                if ($('repeat', data).text() == 'true') {
                    $('#buttonRepeat').removeClass('ui-state-default').addClass('ui-state-active');
                } else {
                    $('#buttonRepeat').addClass('ui-state-default').removeClass('ui-state-active');
                }

                if ($('[name="artwork_url"]', data).text() != currentArt && $('[name="artwork_url"]', data).text() != "") {
                    var tmp = new Date();
                    currentArt = $('[name="artwork_url"]', data).text();
                    updateArt('/art?' + tmp.getTime());
                } else if ($('[name="artwork_url"]', data).text() == "" && currentArt != 'images/vlc-48.png') {
                    currentArt = 'images/vlc-48.png';
                    updateArt(currentArt);
                }

                current_playlist_id = parseInt($('currentplid', data).text());
                if (previous_playlist_id != current_playlist_id) {
                    updatePlayList();
                    previous_playlist_id = current_playlist_id;
                }

                seek_sec = parseInt($('seek_sec', data).text());

                if (pollStatus) {
                    setTimeout(updateStatus, 1000);
                }

            }
            $('band', data).each(function () {
                var id = $(this).attr('id');
                var value = $(this).text() ? $(this).text() : 0;
                var freq = ["60 Hz","170 Hz", "310 Hz", "600 Hz", "1 kHz","3 kHz", "6 kHz", "12 kHz" , "14 kHz" , "16 kHz" ];
                if (!$('#eq_container' + id).length) {
                    $('#window_equalizer').append('<div style="float:left;width:44px;" align="center" id="eq_container' + id + '"><div id="eq' + id + '_txt">' + value + 'dB</div><div class="eqBand" id="eq' + id + '" style="font-size: 18px;"></div><div>' + freq[id] + '</div></div>');
                    $('#eq' + id).slider({
                        min: -20,
                        max: 20,
                        step: 0.1,
                        range: "min",
                        value: value,
                        animate: true,
                        orientation: "vertical",
                        stop: function (event, ui) {
                            $('#' + $(this).attr('id') + '_txt').empty().append(ui.value + 'dB');
                            sendCommand({
                                command: 'equalizer',
                                val: ui.value,
                                band: $(this).attr('id').substr(2)
                            })
                        },
                        slide: function (event, ui) {
                            $('#' + $(this).attr('id') + '_txt').empty().append(ui.value + 'dB');
                        }
                    });
                } else {
                    $('#eq' + id).slider({
                        value: value
                    });
                    $('#eq' + id + '_txt').empty().append(Math.round(value * 100) / 100 + 'dB');
                }
            });
            $('#preamp').slider('value', $('preamp', data).text());
            $('#preamp_txt').empty().append(Math.round($('preamp', data).text() * 100) / 100 + 'dB');
        },
        error: function (jqXHR, status, error) {
            setTimeout(updateStatus, 500);
        }
    });
}

function updatePlayList(force_refresh) {
    if (force_refresh) {
        //refresh playlist..
        //$('#libraryTree').jstree('refresh', -1);
    } else {
        //iterate through playlist..
        var match = false;
        $('.jstree-leaf').each(function(){
            var id = $(this).attr('id');
            if (id != null && id.substr(0,5) == 'plid_') {
                if ( id.substr(5) == current_playlist_id ) {
                    $(this).addClass('ui-state-highlight');
                    $(this).attr('current', 'current');
                    this.scrollIntoView(true);
                    match = true;
                } else {
                    $(this).removeClass('ui-state-highlight');
                    $(this).removeAttr('current');
                }
                if ($(this).children('a').size() > 0) {
                    $($(this).children('a')[0]).removeClass('ui-state-active');
                }
            }
    	});
    	//local title wasn't found - refresh playlist..
    	//if (!match) updatePlayList(true);
    }
}

function sendCommand(params, append) {
    if (current_que == 'stream') {
        $.ajax({
            url: 'requests/status.xml',
            data: params,
            success: function (data, status, jqXHR) {
                if (append != undefined) {
                    eval(append);
                }
                updateStatus();
            }
        });
    } else {
        if (params.plreload === false) {
            $.ajax({
                url: 'requests/status.xml',
                data: params,
                success: function (data, status, jqXHR) {
                    if (append != undefined) {
                        eval(append);
                    }
                }
            });
        } else {
            $.ajax({
                url: 'requests/status.xml',
                data: params,
                success: function (data, status, jqXHR) {
                    if (append != undefined) {
                        eval(append);
                    }
                }
            });
        }
    }
}

function browse(dir) {
    dir = dir == undefined ? 'file://~' : dir;
    $.ajax({
        url: 'requests/browse.xml',
        data: 'uri=' + encodeURIComponent(dir),
        success: function (data, status, jqXHR) {
            var tgt = browse_target.indexOf('__') == -1 ? browse_target : browse_target.substr(0, browse_target.indexOf('__'));
            $('#browse_elements').empty();
            $('element', data).each(function () {
                var ext = $(this).attr('name').substr($(this).attr('name').lastIndexOf('.') + 1).toLowerCase();
                if ($(this).attr('type') == 'dir' || $.inArray(ext, video_types) != -1 || $.inArray(ext, audio_types) != -1 || $.inArray(ext, playlist_types) != -1) {
                    $('#browse_elements').append(createElementLi($(this).attr('name'), $(this).attr('type'), $(this).attr('uri'), ext));
                }
            });
            $('[opendir]').dblclick(function () {
                browse($(this).attr('opendir'));
            });
            $('[openfile]').dblclick(function () {
                switch (tgt) {
                case '#stream_input':
                    $(browse_target).val($(this).attr('openfile'));
                    break;
                case '#mosaic_open':
                    $('li', browse_target).remove();
                    $(browse_target).append(this);
                    $(this).css({
                        'margin-left': -40,
                        'margin-top': -46,
                        'float': 'left'
                    });
                    break;
                case '#mobile':
                    break;
                default:
                    sendCommand('command=in_play&input=' + encodeURIComponent($(this).attr('openfile')));
                    updatePlayList(true);
                    break;
                }
                $('#window_browse').dialog('close');
            });
            $('[opendir]').click(function () {
                switch (tgt) {
                case '#mobile':
                    browse($(this).attr('opendir'));
                    break;
                default:
                    break;
                }
            });
            $('[openfile]').click(function () {
                switch (tgt) {
                case '#mobile':
                    sendCommand('command=in_play&input=' + encodeURIComponent($(this).attr('openfile')), "window.location='mobile.html'");
                    break;
                default:
                    break;
                }
            });
            switch (tgt) {
            case '#mobile':
                break;
            default:
                $('[selectable]').selectable();
                break;
            }
        },
        error: function (jqXHR, status, error) {
            setTimeout('browse("' + dir + '")', 1041);
        }
    });
}

function updateStreams() {
    $.ajax({
        url: 'requests/vlm.xml',
        success: function (data, status, jqXHR) {
            $('#stream_info').accordion("destroy");
            $('#stream_info').empty();
            $('broadcast', data).each(function () {
                var stream_div = $('#stream_status_').clone();
                var name = $(this).attr('name');
                var loop = $(this).attr('loop') == 'yes';
                var playing = $('instance', $(this)).attr('state') == 'playing';
                var file = $('input', $(this)).text();
                var output = $('output', $(this)).text();
                var time = isNaN(Math.round($('instance', $(this)).attr('time') / 1000000)) ? 0 : Math.round($('instance', $(this)).attr('time') / 1000000);
                var length = isNaN(Math.round($('instance', $(this)).attr('length') / 1000000)) ? 0 : Math.round($('instance', $(this)).attr('length') / 1000000);
                $('[id]', stream_div).each(function () {
                    $(this).attr('id', $(this).attr('id') + name);
                });
                $(stream_div).attr('id', $(stream_div).attr('id') + name);
                $('#stream_title_' + name, stream_div).append(name);
                $('#stream_file_' + name, stream_div).append(file);
                $('#stream_pos_' + name, stream_div).slider({
                    value: 0,
                    range: "min",
                    min: 0,
                    slide: function (event, ui) {
                        $("#stream_current_time_" + name, stream_div).empty();
                        $("#stream_current_time_" + name, stream_div).append(format_time(ui.value));
                        $("#stream_total_time_" + name, stream_div).empty();
                        $("#stream_total_time_" + name, stream_div).append(format_time($('#stream_pos_' + name, stream_div).slider('option', 'max')));
                        sendVLMCmd('control ' + name + ' seek ' + Math.round(ui.value / $('#stream_pos_' + name, stream_div).slider('option', 'max') * 100));
                    },
                    change: function (event, ui) {
                        $("#stream_current_time_" + name, stream_div).empty();
                        $("#stream_current_time_" + name, stream_div).append(format_time(ui.value));
                        $("#stream_total_time_" + name, stream_div).empty();
                        $("#stream_total_time_" + name, stream_div).append(format_time($('#stream_pos_' + name, stream_div).slider('option', 'max')));
                    }
                });
                $('#button_stream_stop_' + name, stream_div).click(function () {
                    sendVLMCmd('control ' + name + ' stop');
                    return false;
                });
                $('#button_stream_play_' + name, stream_div).click(function () {
                    if ($('span', this).hasClass('ui-icon-pause')) {
                        sendVLMCmd('control ' + name + ' pause');
                    } else {
                        sendVLMCmd('control ' + name + ' play');
                    }
                });
                $('#button_stream_loop_' + name, stream_div).click(function () {
                    if (loop) {
                        sendVLMCmd('setup ' + name + ' unloop');
                    } else {
                        sendVLMCmd('setup ' + name + ' loop');
                    }
                });
                $('#button_stream_delete_' + name, stream_div).click(function () {
                    sendVLMCmd('del ' + name);
                });
                $('#stream_pos_' + name, stream_div).slider({
                    max: length,
                    value: time
                });
                if (playing) {
                    $('span', $('#button_stream_play_' + name, stream_div)).removeClass('ui-icon-play');
                    $('span', $('#button_stream_play_' + name, stream_div)).addClass('ui-icon-pause');
                }
                if (loop) {
                    $('#button_stream_loop_' + name, stream_div).addClass('ui-state-active');
                }
                $(stream_div).css({
                    'visibility': '',
                    'display': ''
                });
                $('#stream_info').append(stream_div);

            });
            $('.button').hover(

            function () {
                $(this).addClass('ui-state-hover');
            }, function () {
                $(this).removeClass('ui-state-hover');
            });
            $('#stream_info').accordion({
                header: "h3",
                collapsible: true,
                autoHeight: true
            });
            if (current_que == 'stream') {
                $('.dynamic').empty();
                $('#mediaTitle').append($('[name="Current"] input', data).text());
                $('#totalTime').append(format_time(isNaN($('[name="Current"] instance', data).attr('length')) ? 0 : $('[name="Current"] instance', data).attr('length') / 1000000));
                $('#currentTime').append(format_time(isNaN($('[name="Current"] instance', data).attr('time')) ? 0 : $('[name="Current"] instance', data).attr('time') / 1000000));
                $('#progress-bar').slider({
                    value: (($('[name="Current"] instance', data).attr('time') / 1000000) / ($('[name="Current"] instance', data).attr('length') / 1000000) * 100)
                });
                $('#progress-bar').attr('totalLength', $('[name="Current"] instance', data).attr('length') / 1000000);
                $('#buttonPlay').attr('state', $('[name="Current"] instance', data).length > 0 ? $('[name="Current"] instance', data).attr('state') : 'stopped');
                if ($('[name="Current"] instance', data).attr('state') == 'playing') {
                    $('#buttonPlay').removeClass('paused');
                    $('#buttonPlay').addClass('playing');
                } else {
                    $('#buttonPlay').removeClass('playing');
                    $('#buttonPlay').addClass('paused');
                }
                setTimeout(updateStreams, 1000);
            }
        }
    });
}

function updateEQ() {
    $.ajax({
        url: 'requests/status.xml',
        success: function (data, status, jqXHR) {
            $('band', data).each(function () {
                var freq = ["60 Hz","170 Hz", "310 Hz", "600 Hz", "1 kHz","3 kHz", "6 kHz", "12 kHz" , "14 kHz" , "16 kHz" ];
                var id = $(this).attr('id');
                var value = $(this).text() ? $(this).text() : 0;
                if (!$('#eq_container' + id).length) {
                    $('#window_equalizer').append('<div style="float:left;width:44px;" align="center" id="eq_container' + id + '"><div id="eq' + id + '_txt">' + value + 'dB</div><div class="eqBand" id="eq' + id + '" style="font-size: 18px;"></div><div>' + freq[id] + '</div></div>');
                    $('#eq' + id).slider({
                        min: -20,
                        max: 20,
                        step: 0.1,
                        range: "min",
                        value: value,
                        animate: true,
                        orientation: "vertical",
                        stop: function (event, ui) {
                            $('#' + $(this).attr('id') + '_txt').empty().append(ui.value + 'dB');
                            sendEQCmd({
                                command: 'equalizer',
                                val: ui.value,
                                band: $(this).attr('id').substr(2)
                            })
                        },
                        slide: function (event, ui) {
                            $('#' + $(this).attr('id') + '_txt').empty().append(ui.value + 'dB');
                        }
                    });
                } else {
                    $('#eq' + id).slider({
                        value: value
                    });
                    $('#eq' + id + '_txt').empty().append(Math.round(value * 100) / 100 + 'dB');
                }
            });
            $('#preamp').slider('value', $('preamp', data).text());
            $('#preamp_txt').empty().append(Math.round($('preamp', data).text() * 100) / 100 + 'dB');
        }
    })
}

function sendVLMCmd(command, append) {
    var commands = command.split(';');
    if (commands.length > 1) {
        sendBatchVLMCmd(command, append);
    } else {
        if (current_que == 'main') {
            $.ajax({
                url: 'requests/vlm_cmd.xml',
                data: 'command=' + encodeURIComponent(command),
                success: function (data, status, jqXHR) {
                    if ($('error', data).text()) {
                        $('#error_container').append('<div>' + $('error', data).text() + '</div>');
                        $('#window_error').dialog('open');
                    }
                    if (append != undefined) {
                        eval(append);
                    }
                    updateStreams();
                }
            });
        } else {
            $.ajax({
                url: 'requests/vlm_cmd.xml',
                data: 'command=' + encodeURIComponent(command),
                success: function (data, status, jqXHR) {
                    if ($('error', data).text()) {
                        $('#error_container').append('<div>' + $('error', data).text() + '</div>');
                        $('#window_error').dialog('open');
                    }
                    updateStreams();
                }
            });
        }
    }
}

function sendBatchVLMCmd(command, append) {
    var commands = command.split(';');
    $.ajax({
        url: 'requests/vlm_cmd.xml',
        data: 'command=' + encodeURIComponent(commands.shift()),
        success: function (data, status, jqXHR) {
            if ($('error', data).text()) {
                $('#error_container').append('<div>' + $('error', data).text() + '</div>');
                $('#window_error').dialog('open');
            }
            sendVLMCmd(commands.join(';'), append);
        }
    });
}

function sendEQCmd(params) {
    $.ajax({
        url: 'requests/status.xml',
        data: params,
        success: function (data, status, jqXHR) {
            updateEQ();
        }
    });
}

function playlistItemTemplate(id, title, artist, current) {
	const bgColor = current ? 'bg-ctp-mauve/20' : 'bg-ctp-mantle';
	const currentBorder = current ? 'border border-ctp-mauve' : 'border border-ctp-mantle';

	return `
		<div id="plid_${id}" onclick="sendCommand({'command':'pl_play','id':${id}})"
			class="flex items-center space-x-4 ${bgColor} p-3 rounded-lg hover:bg-ctp-surface transition cursor-pointer ${currentBorder}">
			<div class="w-12 h-12 bg-ctp-base rounded-md flex-shrink-0 flex items-center justify-center">
				<i class="fa-solid fa-${current ? 'volume-high text-ctp-mauve' : 'music text-ctp-subtext1'}"></i>
			</div>
			<div class="flex-1 min-w-0">
				<p class="text-ctp-text text-sm font-medium truncate">${title}</p>
				<p class="text-ctp-subtext1 text-xs truncate">${artist}</p>
			</div>
			${current ? '<span class="text-ctp-mauve text-xs font-bold">PLAYING</span>' : ''}
			<i class="fa-solid fa-ellipsis-vertical text-ctp-subtext1"></i>
		</div>
	`;
}

function updateNextPlaylist() {
	$.ajax({
		url: 'requests/playlist.xml', // Standard VLC playlist endpoint
		success: function(xml) {
			let playlistHtml = '';
			const currentId = parseInt($(xml).find('current').text(), 10);

			$(xml).find('leaf').each(function() {
				const id = $(this).attr('id');
				const name = $(this).attr('name');
				const isCurrent = parseInt(id, 10) === currentId;

				const parts = name.split(' - ');
				const title = parts.length > 1 ? parts[1] : name;
				const artist = parts.length > 1 ? parts[0] : 'Unknown Artist';

				playlistHtml += playlistItemTemplate(id, title, artist, isCurrent);
			});

			$('#nextPlaylistContainer').html(playlistHtml);
		},
		error: function() {
			$('#nextPlaylistContainer').html('<p class="text-ctp-red">Error loading playlist.</p>');
		}
	});
}

$(function () {
    $('#albumArt').load(function () {
        $(this).removeClass('hidden').fadeIn();
    });
	updateNextPlaylist();
	setInterval(function() {
		updateNextPlaylist();
	}, 5000);
    updateStatus();
    updateStreams();
    updateEQ();
});
