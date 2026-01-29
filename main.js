const url = new URL(window.location.href);

const paramChannel = url.searchParams.get('channel') || url.searchParams.get('c')
const paramOnlyListed = url.searchParams.has('onlyListed')

const config = {
  channel: paramChannel || 'naaaske',
  emotes: new Map(),
};

const loadEmotes = async () => {
  const proxy = "https://api.roaringiron.com/proxy/";

  const response = await fetch(
      proxy + "https://api.ivr.fi/v2/twitch/user?login=" + config.channel,
      {
          headers: { "User-Agent": "api.roaringiron.com/emoteoverlay" },
      }
  );
  const data = await response.json();
  let twitchId = null;
  if (data && data.length > 0) {
      twitchId = data[0].id;
  } else {
    const message = `Could not find channel <i>${config.channel}</i>`
    $("#errors").html(message);
    return
  }

  await fetch(proxy + "https://api.frankerfacez.com/v1/room/" + config.channel)
    .then(response => {
      if (!response.ok) return;
      return response.json()
    })
    .then(data => {
      if (!data) return;
      const emoteNames = Object.keys(data.sets);
      for (let i = 0; i < emoteNames.length; i++) {
        for (let j = 0; j < data.sets[emoteNames[i]].emoticons.length; j++) {
          const emote = data.sets[emoteNames[i]].emoticons[j];
          const name = emote.name;
          const url = "https://" + (emote.urls["4"] || emote.urls["2"] || emote.urls["1"]).split("//").pop();

          config.emotes.set(name, url);
        }
      }
    })
    .catch();

  await fetch(proxy + "https://api.frankerfacez.com/v1/set/global")
    .then(response => {
      if (!response.ok) return;
      return response.json()
    })
    .then(data => {
      if (!data) return;
      const emoteNames = Object.keys(data.sets);
      for (let i = 0; i < emoteNames.length; i++) {
        for (let j = 0; j < data.sets[emoteNames[i]].emoticons.length; j++) {
          const emote = data.sets[emoteNames[i]].emoticons[j];
          const name = emote.name;
          const url = "https://" + (emote.urls["4"] || emote.urls["2"] || emote.urls["1"]).split("//").pop();
          
          config.emotes.set(name, url);
        }
      }
    })
    .catch();

  await fetch(proxy + "https://api.betterttv.net/3/cached/users/twitch/" + twitchId)
    .then(response => {
      if (!response.ok) return;
      return response.json()
    })
    .then(data => {
      if (!data) return;
      for (let i = 0; i < data.channelEmotes.length; i++) {
        const name = data.channelEmotes[i].code;
        const url = `https://cdn.betterttv.net/emote/${data.channelEmotes[i].id}/3x`;

        config.emotes.set(name, url);
      }
      for (let i = 0; i < data.sharedEmotes.length; i++) {
        const name = data.sharedEmotes[i].code;
        const url = `https://cdn.betterttv.net/emote/${data.sharedEmotes[i].id}/3x`;

        config.emotes.set(name, url);
      }
    })
    .catch();

  await fetch(proxy + "https://api.betterttv.net/3/cached/emotes/global")
    .then(response => {
      if (!response.ok) return;
      return response.json()
    })
    .then(data => {
      if (!data) return;
      for (let i = 0; i < data.length; i++) {
        const name = data[i].code
        const url = `https://cdn.betterttv.net/emote/${data[i].id}/3x`

        config.emotes.set(name, url);
      }
    })
    .catch();

  await fetch(proxy + "https://7tv.io/v3/users/twitch/" + twitchId)
    .then(response => {
      if (!response.ok) return;
      return response.json()
    })
    .then(data => {
      if (!data) return;
      const emoteSet = data["emote_set"];
      if (emoteSet === null) return;
      const emotes = emoteSet["emotes"];
      for (let i = 0; i < emotes.length; i++) {
        if (paramOnlyListed && emotes[i].data.listed === false) {
          continue;
        }
        const miniUrl = emotes[i].data.host.url;
        const fileExt = emotes[i].data.host.files[3]?.name;
        if (miniUrl && fileExt) {
          const name = emotes[i].name;
          const url = `https:${miniUrl}/4x.webp`;

          config.emotes.set(name, url)
        }
      }
      connectTo7tvUpdates(data["emote_set_id"]);
    })
    .catch();

  await fetch(proxy + "https://7tv.io/v3/emote-sets/global")
    .then(response => {
      if (!response.ok) return;
      return response.json()
    })
    .then(data => {
      if (!data) return;
      for (let i = 0; i < data.emotes.length; i++) {
        const name = data.emotes[i].name;
        const url = `https://cdn.7tv.app/emote/${data.emotes[i].id}/4x.webp`;

        config.emotes.set(name, url);
      }
    })
    .catch();

  const message = `<div>Successfully loaded ${config.emotes.size} emotes for channel<i> ${config.channel} </i> ` + (!paramChannel ? `\n` + `If you want another channel, enter it in the URL. Example: https://naske.chat?c=<i>${config.channel}</i></div>` : `</div>`);
  $("#errors").append().html(message).delay(paramChannel ? 5000 : 10000).fadeOut(300);
};

const findEmoteInMessage = (message) => {
  return message.filter(word => config.emotes.has(word));
};

const findEmotes = (message, rawMessage) => {
  if (config.emotes.size === 0) return;

  const emoteUrlsUsed = [];

  const ttvEmoteTag = rawMessage.find(part => part.startsWith("emotes="));
  if (ttvEmoteTag){
    const ttvEmotesUsed = ttvEmoteTag.split("emotes=").pop();

    if (ttvEmotesUsed.length > 0){
      const url = `https://static-cdn.jtvnw.net/emoticons/v2/${ttvEmotesUsed.split(":")[0]}/default/dark/4.0`;
      emoteUrlsUsed.push(url);
    }
  }
  
  const splitMessage = message.split(" ").filter((a) => !!a.length);
  const matchedEmotes = findEmoteInMessage(splitMessage);
  matchedEmotes.forEach(emote => {
    const url = config.emotes.get(emote)
    emoteUrlsUsed.push(url);
  });

  if(emoteUrlsUsed.length > 0){
    const emoteUrl = emoteUrlsUsed[Math.floor(Math.random() * matchedEmotes.length)];
    displayEmoteURL(emoteUrl);
  }
};

const displayEmoteURL = (url) => {
  if (url == '') {
    $("#showEmote").html('');
  }

  const image = new Image();
  image.src = url;
  image.onload = () => {
    $("#showEmote").html(image);
  };
};

const connectTo7tvUpdates = (stvSetId) => {
  const stvUpdates = new WebSocket("wss://events.7tv.io/v3?version=1.4.31");
  const timeout = setTimeout(() => {
    chat.close();
    chat.connect();
  }, 10000);

  stvUpdates.onopen = function () {
    clearInterval(timeout);
    stvUpdates.send(
      `{"op":35,"d":{"type":"emote_set.update","condition":{"object_id":"${stvSetId}"}}}`
    )
    console.log("Connected to 7TV set updates");
  }

  stvUpdates.onerror = function () {
    console.error("There was an error.. disconnected from the 7TV set updates");
    stvUpdates.close();
    stvUpdates.connect();
  };

  stvUpdates.onmessage = function (event) {
    const messageData = JSON.parse(event.data)["d"];

    if (messageData["type"] == "emote_set.update"){
      const body = messageData["body"]
      const pulled = body["pulled"];
      const pushed = body["pushed"];

      if (pulled){
        pulled.forEach(e => {
          if (e["key"] == 'emotes'){
            const emote = e["old_value"]
            const name = emote["name"]
            config.emotes.delete(name);
            displayEmoteURL('');
          }
        });
      }

      if (pushed){
        pushed.forEach(e => {
          if (e["key"] == 'emotes'){
            const emote = e["value"]
            const name = emote["name"]
            const url = `https:${emote["data"]["host"]["url"]}/4x.webp`
            config.emotes.set(name, url);
            displayEmoteURL(url);
          }
        });
      }
    }
  }
}

const connectToChat = () => {
  const chat = new WebSocket("wss://irc-ws.chat.twitch.tv");
  const timeout = setTimeout(() => {
    chat.close();
    chat.connect();
  }, 10000);

  chat.onopen = function () {
    clearInterval(timeout);
    chat.send(
      "CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"
    );
    chat.send("PASS oauth:xd123");
    chat.send("NICK justinfan123");
    chat.send("JOIN #" + config.channel);
    console.log("Connected to Twitch IRC");
  };

  chat.onerror = function () {
    console.error("There was an error.. disconnected from the IRC");
    chat.close();
    chat.connect();
  };

  chat.onmessage = function (event) {
    const usedMessage = event.data.split(/\r\n/)[0];
    const textStart = usedMessage.indexOf(` `); // tag part ends at the first space
    const fullMessage = usedMessage.slice(0, textStart).split(`;`); // gets the tag part and splits the tags
    fullMessage.push(usedMessage.slice(textStart + 1));

    if (fullMessage.length > 13) {
      const parsedMessage = fullMessage[fullMessage.length - 1]
        .split(`${config.channel} :`)
        .pop(); // gets the raw message
      let message = parsedMessage.split(" ").includes("ACTION")
        ? parsedMessage.split("ACTION ").pop().split("")[0]
        : parsedMessage; // checks for the /me ACTION usage and gets the specific message
      findEmotes(message, fullMessage);
    }
    if (fullMessage.length == 2 && fullMessage[0].startsWith("PING")) {
      console.log("sending pong");
      chat.send("PONG");
    }
  };
};

const init = () => {
  loadEmotes();
  connectToChat();
}