// @flow

import React, { useState, useEffect, useReducer } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  PermissionsAndroid
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
} from 'react-native-paper';
import {
  RTCRtpSender,
  RTCRtpReceiver,
  RTCVideoView,
  RTCObjectFit,
  RTCLogger as logger
} from 'react-native-webrtc-kit';
import { Sora } from './Sora';
import { url, defaultChannelId } from './app.json';

logger.setDebugMode(true);

async function requestPermissionsAndroid() {
  try {
    await PermissionsAndroid.requestMultiple(
      [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      ]
    );
  } catch (err) {
    console.warn(err);
  }
}

const tracksReducer = (tracks, action) => {
  switch (action.type) {
    case 'add':
      newTracks = [...tracks];

      tracks.forEach(track => console.log('DEBUG: taskReducer, tracks', track.id))
      newTracks.forEach(track => console.log('DEBUG: taskReducer, newTracks', track.id))
      newTracks.push(action.newTrack);
      return newTracks;
    case 'remove':
      if (action.removedClientIds && tracks) {
        tracks.forEach(track => console.log('DEBUG: taskReducer, action.removedClientIds', action.removedClientIds))
        newTracks = tracks.filter(
          track => !action.removedClientIds.includes(track.id)
        );
        return newTracks;
      }
    case 'set':
      return action.tracks;
    case 'clear':
      return [];
  }
}

const App = () => {
  const [channelId, setChannelId] = useState(defaultChannelId);
  const [signalingKey, setSignalingKey] = useState("");
  const [sora, setSora] = useState(null);
  const [sender, setSender] = useState(null);
  const objectFit = 'cover';
  const [tracks, dispatchTracks] = useReducer(tracksReducer, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestPermissionsAndroid()
    }

    const interval = setInterval(() => {
      console.log(setInterval);
      if (sora) {
        dispatchTracks({type: 'remove', removedClientIds: sora.removedClientIds})
      }
    }, 1000);

    return () => clearInterval(interval);
  })

  return (
    <View style={styles.body}>
      <View style={styles.div_content}>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          <TextInput
            label="チャネルID"
            mode="outlined"
            style={{
              width: '100%',
              height: 60,
              borderColor: 'gray'
            }}
            onChangeText={(channelId) => setChannelId(channelId) }
            value={channelId}
            placeholder='Channel ID'
          />
          <TextInput
            label="シグナリングキー"
            mode="outlined"
            style={{
              width: '100%',
              minWidth: '80%',
              height: 60,
              borderColor: 'gray'
            }}
            onChangeText={(signalingKey) => setSignalingKey(signalingKey) }
            value={signalingKey}
            placeholder='Signaling Key'
          />
        </View>
        <View>
          <Button
            raised
            mode="outlined"
            onPress={() => {
              const role = 'group';
              const sora = new Sora(url, role, channelId, signalingKey);

              sora.onconnectionstatechange = function (event) {
                if (event.target.connectionState != 'connected') {
                  return;
                }

                var sender = sora._pc.senders.find(each => {
                  return each.track.kind == 'video'
                });

                var tracks = sora._pc.receivers.filter(each =>
                  each.track.kind == 'video'
                ).map(each => each.track);

                setSender(sender);
                dispatchTracks({type: 'set', tracks: tracks});
              }.bind(this);

              sora.ontrack = function(event) {
                if (event.track && event.track.kind == 'video') {
                  dispatchTracks({type: 'add', newTrack: event.track});
                  console.log('# DEBUG: ontrack, event.track.id', event.track.id)
                  console.log('# DEBUG: ontrack, event.track._valueTag', event.track._valueTag)
                }
              }.bind(this);

              sora.connect(dispatchTracks);
              sora._ws.messages
              setSora(sora);
            }}
          >
            接続する
          </Button>
          <Button
            raised
            mode="outlined"
            onPress={() => {
              logger.log("# disconnect");
              if (sora) {
                sora.disconnect();
              }
              setSora(null);
              setSender(null);
              dispatchTracks({action: 'clear'});
            }}
          >
            接続解除する
          </Button>
        </View>
        <View style={styles.div_header}>
          <RTCVideoView
            style={styles.videoview}
            track={sender? sender.track : null }
            objectFit={objectFit}
          />
        </View>
        {tracks ? tracks.map((track, i) => {
          return (
            <View key={i} style={styles.div_header}>
              <RTCVideoView
                style={styles.videoview}
                track={track}
                objectFit={objectFit}
              />
            </View>
          )
        }) : null}
      </View>
    </View >
  );
}

export default App;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    backgroundColor: '#F5FCFF',
    padding: 30
  },
  div_header: {
    width: '100%',
    aspectRatio: 16.0 / 9.0,
    backgroundColor: 'black',
    elevation: 4,
    marginBottom: 10
  },
  div_content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  videoview: {
    flex: 1,
    backgroundColor: 'lightgray',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
});
