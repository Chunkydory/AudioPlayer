/* 
    Audio player made for Snowball.music by Valentijn Nieman
    Using jQuery and Web Audio

    classes are upper CamelCase, normal functions are lowercase/underscored
 */

function AudioPlayer(index, song, context, parent, replace)
{   // the AudioPlayer class
    this.index = index;                         // position in songs_array
    this.parent = parent;                       // element to append new html to
    this.song = song;                           // as passed from php to songs_array
    this.context = context;                     // the main AudioContext
    this.analyser = context.createAnalyser();   // used to analyze song waveform
    
    this.analyser.smoothingTimeConstant = 0.3;
    this.analyser.fftSize = 1024;
    
    this.url = './audio/field_vision_25092015.mp3';
    // create html elements and select them using jQuery
    this.create_elements(replace);
    
    this.canvas = $('#canvas_' + song.song_id).get(0);
    this.canvas_context = this.canvas.getContext('2d');
    this.canvas_width = this.canvas.width;
    this.canvas_height = this.canvas.height;
    this.canvas_context.fillStyle = "red";
    this.canvas_context.clearRect(0,0, this.canvas_width, this.canvas_height);
    
    // html elements
    this.wrapper = $('#song_' + index);
    this.button = $('#play_' + song.song_id);
    this.timeline = $('#tl_' + song.song_id);
    this.progress = $('#p_' + song.song_id);
    this.playpos = $('#pp_' + song.song_id);
    this.anticipate = $('#a_' + song.song_id);
    
    this.bind_events();     // binds mouseclicks etc
        
    //this.print_song();
}

AudioPlayer.prototype.draw_frequencies = function()
{          
    var gradient = this.canvas_context.createLinearGradient(0,0,0,300);
    gradient.addColorStop(1,'#000000');
    gradient.addColorStop(0.75,'#005942');
    gradient.addColorStop(0.25,'#66FFFF');
    gradient.addColorStop(0,'#FFFFCC');
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(this.dataArray);
    
    this.canvas_context.clearRect(0, 0, this.canvas_width, this.canvas_height);
    this.canvas_context.fillStyle = gradient;
    
    for(var i = 0; i < this.dataArray.length; i++)
    {
        var value = this.dataArray[i];
        this.canvas_context.fillRect(i*3, 250-value, 2, 325);
    }
};

AudioPlayer.prototype.create_elements = function(replace)
{   // creates the html elements of the player as needed
    var html_string = "<div class='song' id=" + "song_" + this.index  + ">" + 
    "<img class='img-responsive' src=./img/" + this.song.img + ">" + 
    "<div class='header' id='song-header'>" +
    "<div class='audio-controls'><button id='play_" + this.song.song_id + "' class='play-button'></button>" +
    "<div class='timeline' id='tl_" + this.song.song_id + "'><canvas class='waveform-canvas' id='canvas_" + 
     this.song.song_id +"'></canvas><div class='progress' id='p_" + this.song.song_id + "'></div>" + 
    "<div class='anticipate' id='a_" + this.song.song_id + "'></div><div class='play-pos' id='pp_" + this.song.song_id + "'></div></div></div>" +
    "<div id='likes-amount'><div id='green-circle'></div><div class='number'>" + this.song.likes + "</div></div>" +
    "<div id='dislikes-amount'><div id='red-circle'></div><div class='number'>" + this.song.dislikes + "</div></div></div>" +
    "<div class='sider' id='song-sider'>" + 
    "<div class='link-controls'>" + "<a class='link-button' id='scloud-button'></a>" + 
    "<a class='link-button' id='spotify-button'></a><a class='link-button' id='bandcamp-button'></a>" +
    "<a class='link-button' id='itunes-button'></a></div></div>" +
    "<div class='footer' id='song-footer'>" +
    "<span>" + this.song.artist + " - " + this.song.title + "</span>" +
    "</div></div>";	//append to the html string
    
    if(!replace)this.parent.append(html_string);
    else if(replace)this.parent.html(html_string);
};

AudioPlayer.prototype.bind_events = function()
{   // binds events such as mousedown to elements
    this.button.click(this.toggle.bind(this));
    this.timeline.mousedown(this.mouse_down.bind(this));
    this.timeline.mousemove(this.timeline_move.bind(this));
    this.timeline.mouseleave(this.timeline_leave.bind(this));
    $(window).mouseup(this.mouse_up.bind(this));
};

AudioPlayer.prototype.load_song = function()
{   // standard web audio way of loading an audiofile with AJAX
    this.button.css("background-image", "url('./img/progression.gif'" + ")");
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function()
    {
        this.context.decodeAudioData(xhr.response, function(buffer)
        {
            this.buffer = buffer;
            this.button.css("background-image", "url('./img/pause.png'" + ")");
            this.draw();
            this.play();
        }.bind(this));
    }.bind(this);
    xhr.send();
};

AudioPlayer.prototype.connect = function()
{   // create a new buffersource (required by web audio) & connect
  if(this.playing) this.pause();
  
  this.source = this.context.createBufferSource();
  this.source.buffer = this.buffer;
  this.source.connect(this.context.destination);    // connect source to output
  this.source.connect(this.analyser);               // connect the analyser for waveform analysis
};

AudioPlayer.prototype.toggle = function()
{   // toggles between pause and play
    if (!this.playing)
    {
        if(!this.loaded)
        {
            this.load_song();
            this.loaded = true;
        }
        else this.play();
    }
    else if (this.playing)
    {
        this.pause();
    }
};

AudioPlayer.prototype.play = function(position)
{    // connects, sets position and plays audio
    this.connect();
    // set position if position is a number
    this.position = typeof position === 'number' ? position : this.position || 0;
    this.start_time = this.context.currentTime - (this.position || 0);
    this.source.start(this.context.currentTime, this.position);
    this.playing = true;
    
    this.button.css("background-image", "url('./img/pause.png'" + ")");
};

AudioPlayer.prototype.pause = function()
{   // pauses and remembers position
    if(this.source) // check if there's a buffersource / if song is playing
    {
        this.source.stop(0);
        this.source = null;
        this.position = this.context.currentTime - this.start_time; // remember position
        this.playing = false;
        
        this.button.css("background-image", "url('./img/play.png'" + ")");
    }
};

AudioPlayer.prototype.update_position = function()
{   // returns current position in song
    this.position = this.playing ? this.context.currentTime - this.start_time : this.position;
    if (this.position >= this.buffer.duration)  // reached end of song
    {
        this.pause();
        this.position = this.buffer.duration;
        this.seek(0);
    }
    return this.position;
};

AudioPlayer.prototype.draw = function()
{   // animates the timeline
    if(this.playing)
    {
        var progress = this.update_position() / this.buffer.duration;
        var width = this.timeline.outerWidth() - 3;
        this.progress.css('width', progress * width);
        if(!this.dragging)this.playpos.css('left', progress * width);

        this.draw_frequencies();
    }
        requestAnimationFrame(this.draw.bind(this));
};

AudioPlayer.prototype.seek = function(time)
{   // move to position on timeline
    if(this.playing) this.play(time);
    else this.position = time;
};

AudioPlayer.prototype.mouse_down = function(event)
{   // click on timeline to jump to position
    this.dragging = true;
    this.start_x = event.clientX;
    this.start_left = this.timeline.offset().left;
    
    position = this.start_x - this.start_left;
    this.playpos.css('left', position);
};

AudioPlayer.prototype.timeline_leave = function(event)
{   // timeline onmouseleave event
    this.anticipate.css('width', 0);
    this.dragging = false;
};

AudioPlayer.prototype.timeline_move = function(event)
{   // drag the playpos to move on timeline
    var offset, position;
    
    offset = this.timeline.offset().left;
    position = event.clientX;
    this.anticipate.css('width', position - offset);
    
    if(this.dragging)
    {
        offset = this.timeline.offset().left;
        position = event.clientX;
        this.playpos.css('left', position - offset);
    }
};

AudioPlayer.prototype.mouse_up = function()
{   // jump to position of playpos
    var width, left, time;
    console.log(this.playing);
    if(this.dragging)
    {
        width = this.timeline.outerWidth();
        left = parseInt(this.playpos.css('left') || 0, 10);
        time = left / width * this.buffer.duration;
        this.seek(time);
        this.dragging = false;
    }
};

AudioPlayer.prototype.print_song = function()
{   // debug
    return this.button;
};
