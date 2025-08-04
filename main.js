const url = new URL(window.location.href);

const paramChannel = url.searchParams.get('channel') || url.searchParams.get('c')
const paramOnlyListed = url.searchParams.has('onlyListed')

const config = {
  channel: paramChannel || 'northernlion',
  currentEmote: { emote: "", url: "" },
  emotes: [],
};

const init = async () => {
  // const proxy = "https://tpbcors.herokuapp.com/";
  const proxy = "https://api.roaringiron.com/proxy/";

  const twitchId = (
    await (
      await fetch(
        proxy + "https://api.ivr.fi/v2/twitch/user?login=" + config.channel,
        {
          headers: { "User-Agent": "api.roaringiron.com/emoteoverlay" },
        }
      )
    ).json()
  )?.[0].id;

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
          config.emotes.push({
            name: emote.name,
            url:
              "https://" +
              (emote.urls["4"] || emote.urls["2"] || emote.urls["1"]).split("//").pop(),
          });
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
          config.emotes.push({
            name: emote.name,
            url:
              "https://" +
              (emote.urls["4"] || emote.urls["2"] || emote.urls["1"]).split("//").pop(),
          });
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
        config.emotes.push({
          name: data.channelEmotes[i].code,
          url: `https://cdn.betterttv.net/emote/${data.channelEmotes[i].id}/3x`,
        });
      }
      for (let i = 0; i < data.sharedEmotes.length; i++) {
        config.emotes.push({
          name: data.sharedEmotes[i].code,
          url: `https://cdn.betterttv.net/emote/${data.sharedEmotes[i].id}/3x`,
        });
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
        config.emotes.push({
          name: data[i].code,
          url: `https://cdn.betterttv.net/emote/${data[i].id}/3x`,
        });
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
        const url = emotes[i].data.host.url;
        const fileExt = emotes[i].data.host.files[3]?.name;
        if (url && fileExt) {
          config.emotes.push({
            name: emotes[i].name,
            url: `https:${url}/4x.webp`
          });
        }
      }
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
        config.emotes.push({
          name: data.emotes[i].name,
          url: `https://cdn.7tv.app/emote/${data.emotes[i].id}/4x.webp`,
        });
      }
    })
    .catch();

  const message = `Successfully loaded ${config.emotes.length} emotes for channel ${config.channel}` + (!paramChannel ? `<br>If you want another channel, enter it in the URL. Example: https://naske.chat?c=${config.channel}` : ``);

  $("#errors").append().html(message).delay(paramChannel ? 2000 : 10000).fadeOut(300);
  console.log(message, config.emotes);
};

const findEmoteObjectInMessage = (message) => {
  for (const emote of config.emotes) {
    if (message.includes(emote.name)) {
      return emote;
    }
  }
  return null;
};

const findEmotes = (message, rawMessage) => {
  if (config.emotes.length === 0) return;

  const emoteUsedPos = rawMessage[4].startsWith("emotes=")
    ? 4
    : rawMessage[5].startsWith("emote-only=")
      ? 6
      : 5;

  const emoteUsed = rawMessage[emoteUsedPos].split("emotes=").pop();
  const splitMessage = message.split(" ").filter((a) => !!a.length);

  if (
    rawMessage[emoteUsedPos].startsWith("emotes=") &&
    emoteUsed.length > 1
  ) {
    config.currentEmote.emote = message.substring(
      parseInt(emoteUsed.split(":")[1].split("-")[0]),
      parseInt(emoteUsed.split(":")[1].split("-")[1]) + 1
    );
    config.currentEmote.url = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteUsed.split(":")[0]
      }/default/dark/4.0`;
  } else {
    const emoteObj = findEmoteObjectInMessage(splitMessage);
    if (emoteObj !== null) {
      config.currentEmote.emote = emoteObj.name;
      config.currentEmote.url = emoteObj.url;
    }
  }

  displayEmote();
};

const displayEmote = () => {
  const image = new Image();
  image.src = config.currentEmote.url;
  image.onload = () => {
    $("#showEmote").html(image);
  };
};

const connect = () => {
  const chat = new WebSocket("wss://irc-ws.chat.twitch.tv");
  const timeout = setTimeout(() => {
    chat.close();
    chat.connect();
  }, 10000);

  chat.onopen = function () {
    init();
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
