// @flow

import React, { Component } from 'react';
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

type Props = {};

type State = {
  channelId: string,
  signalingKey: String,
  sora: Sora | null,
  sender: RTCRtpSender | null;
  tracks: Array<RTCMediaStreamTrack>;
  objectFit: RTCObjectFit
};

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


export default class App extends Component<Props, State> {

  constructor(props: Object) {
    super(props);
    this.state = {
      channelId: defaultChannelId,
      signalingKey: '',
      sora: null,
      sender: null,
      tracks: [],
      objectFit: 'cover'
    };
  }

  componentDidMount() {
    // Android の場合カメラの権限をリクエストする
    // XXX(kdxu): 厳密には拒否された場合の処理がいるはず。
    if (Platform.OS === 'android') {
      requestPermissionsAndroid()
    }
  }

  render() {
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
              onChangeText={(channelId) =>
                  this.setState({ channelId: channelId })
              }
              value={this.state.channelId}
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
              onChangeText={(signalingKey) =>
                  this.setState({ signalingKey: signalingKey })
              }
              value={this.state.signalingKey}
              placeholder='Signaling Key'
            />
          </View>
          <View>
            <Button
              raised
              mode="outlined"
              onPress={() => {
                this.setState(prev => {
                  const role = 'group';
                  const sora = new Sora(url, role, prev.channelId, prev.signalingKey);
                  sora.onconnectionstatechange = function (event) {
                    this.setState(prev => {
                      logger.log("# connection state change => ",
                        event.target.connectionState);
                      if (event.target.connectionState == 'connected') {
                        var sender = prev.sora._pc.senders.find(each => {
                          return each.track.kind == 'video'
                        });
                        var tracks = prev.sora._pc.receivers.filter(each =>
                          each.track.kind == 'video'
                        ).map(each => each.track);

                        logger.log('# DEBUG: connected, tracks:', tracks);
                        return {
                          sender: sender,
                          tracks: tracks,
                        }
                      }
                    });
                  }.bind(this);
                  sora.ontrack = function (event) {
                    logger.log('# DEBUG: ontrack, event', event);
                    if (event.track && event.track.kind == 'video') {
                      logger.log('# DEBUG: ontrack, event.track', event.track);
                      this.setState(prev => {
                        prev.tracks.push(event.track);
                        return {
                          tracks: prev.tracks,
                        };
                      });
                    }
                  }.bind(this);
                  sora.connect();
                  return { sora: sora };
                });
              }}
            >
              接続する
            </Button>
            <Button
              raised
              mode="outlined"
              onPress={() => {
                logger.log("# disconnect");
                if (this.state.sora) {
                  this.state.sora.disconnect();
                }
                this.setState(prev => {
                  return {
                    sora: null,
                    sender: null,
                    tracks: [],
                  }
                });
              }}
            >
              接続解除する
            </Button>
          </View>
         <View style={styles.div_header}>
            <RTCVideoView
              style={styles.videoview}
              track={this.state.sender ? this.state.sender.track : null}
              objectFit={this.state.objectFit}
            />
          </View>
          {this.state.tracks.map((track, i) => {
            return (
              <View key={i} style={styles.div_header}>
                <RTCVideoView
                  style={styles.videoview}
                  track={track}
                  objectFit={this.state.objectFit}
                />
              </View>
            )
          })}
        </View>
      </View >
    );
  }
}

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
