import './global.css';
import {
  Image,
  Pressable,
  SafeAreaView,
  View,
  ActivityIndicator,
  Text,
  Linking,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import axios from 'axios';

export default function App() {
  const baseURL = 'https://pathfinder-um68.onrender.com';
  const [loading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultFound, setResultFound] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      if (!isRecording) {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) return alert('Permission required!');

        setIsRecording(true);
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

        // Stop previous if any
        if (recordingRef.current) {
          try {
            await recordingRef.current.stopAndUnloadAsync();
          } catch (e) {
            console.log('No active recording to stop');
          } finally {
            recordingRef.current = null;
          }
        }

        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync({
          android: {
            extension: '.m4a',
            outputFormat: 2, // MPEG_4
            audioEncoder: 3, // AAC
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.caf',
            audioQuality: 2,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        recordingRef.current = rec;

        await rec.startAsync();
        console.log('Recording started');

        setTimeout(() => {
          console.log('Stopping after 10s');
          stopRecordingAndRecognize();
        }, 10000);
      }
    } catch (err) {
      console.error('Recording error', err);
    }
  };

  const stopRecordingAndRecognize = async () => {
    const rec = recordingRef.current;
    if (!rec) return;

    setIsLoading(true);
    setIsRecording(false);

    try {
      await rec.stopAndUnloadAsync();
      recordingRef.current = null;

      const uri = rec.getURI();
      if (!uri) throw new Error('Recording URI not available');
      console.log('1.');

      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileUri = fileInfo.uri;

      console.log('2.');

      const response = await fetch(fileUri);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('audio', {
        uri: fileUri,
        type: 'audio/wav',
        name: 'audio.wav',
      } as any);

      console.log('3.');

      const fetchRes = await fetch(`${baseURL}/recognize`, {
        method: 'POST',
        body: formData,
      });

      const resultJson = await fetchRes.json();

      if(resultJson.status.msg == 'Success') {
        console.log(JSON.stringify(resultJson));
        console.log('4.');
        setResult(resultJson);
        setResultFound(true);
      }
      else{
        alert('No result found. Please try again.');
      }
    } catch (err) {
      console.error('Recognition error', err);
      alert('Recognition failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSpotify = (trackId: string) => {
    const url = `spotify://track/${trackId}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://open.spotify.com/track/${trackId}`);
    });
  };

  const openYouTube = (videoId: string) => {
    const appUrl = `vnd.youtube:${videoId}`;
    const webUrl = `https://youtu.be/${videoId}`;

    Linking.openURL(appUrl).catch(() => {
      Linking.openURL(webUrl);
    });
  };

  const openDeezer = (trackId: string) => {
    const deezerAppUrl = `deezer://track/${trackId}`;
    const deezerWebUrl = `https://www.deezer.com/track/${trackId}`;

    Linking.openURL(deezerAppUrl).catch(() => {
      Linking.openURL(deezerWebUrl);
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          padding: 20,
        }}>
        <View />
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Pressable onPress={startRecording}>
            <LottieView
              source={require('./assets/lottie/lisening.json')}
              loop={isRecording}
              autoPlay={isRecording}
              style={{ width: 200, height: 200, transform: [{ translateY: 40 }] }}
            />
          </Pressable>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%' }}>
          <Pressable
          style={{
            width: 65,
            height: 65,
          }}
          onPress={
            async () => {
              setIsRecording(false);
              if (recordingRef.current) {
                try {
                  await recordingRef.current.stopAndUnloadAsync();
                } catch (e) {
                  console.log('No active recording to stop');
                } finally {
                  recordingRef.current = null;
                }
              }
              setResult(null);
              setResultFound(false);
              setIsLoading(false);
            }
          }
          >
            <View
              style={{
                width: 65,
                height: 65,
                borderRadius: 999,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)',
              }}>
              <Image source={require('./assets/undo.png')} style={{ width: 35, height: 35 }} />
            </View>
          </Pressable>
        </View>
      </View>

      {resultFound && result && (
        <Pressable
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundColor: 'transparent',
            borderRadius: 20,
            paddingTop: 2,
            padding: 20,
            paddingBottom: 40,
            zIndex: 100,
          }}
          onPress={() => {
            setResultFound(false);
            setResult(null);
          }}
          >
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 'auto',
            backgroundColor: 'white',
            boxShadow: '0 -12px 20px rgba(0, 0, 0, 0.2)',
            borderRadius: 20,
            paddingTop: 2,
            padding: 20,
            paddingBottom: 40,
            zIndex: 100,
          }}>
            <View
              style={{
                marginLeft: 'auto',
                marginRight: 'auto',
                width: 100,
                height: 5,
                borderRadius: 8,
                backgroundColor: '#666',
              }}></View>

            <Text
              style={{
                fontSize: 24,
                textAlign: 'center',
                marginBottom: 4,
                width: '95%',
                marginTop: 16,
              }}>
              Title: {(result as any)?.metadata.music[0].title || 'Unknown'}
            </Text>
            <Text style={{ fontSize: 24, textAlign: 'center', width: '95%' }}>
              Artist: {(result as any)?.metadata.music[0].artists[0].name || 'Unknown'}
            </Text>
            <Pressable
              onPress={() => {
                openSpotify((result as any).metadata.music[0].external_metadata.spotify.track.id);
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '80%',
                marginTop: 16,
                marginLeft: 'auto',
                marginRight: 'auto',
                height: 70,
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 25,
                paddingHorizontal: 20,
              }}>
              <Image source={require('./assets/spotify.png')} style={{ width: 30, height: 30 }} />
              <Text style={{ fontSize: 18, color: '#333', marginLeft: 10 }}>Spotify</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                openDeezer((result as any).metadata.music[0].external_metadata.deezer.track.id);
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '80%',
                marginTop: 16,
                marginLeft: 'auto',
                marginRight: 'auto',
                height: 70,
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 25,
                paddingHorizontal: 20,
              }}>
              <Image source={require('./assets/deezer.png')} style={{ width: 30, height: 30 }} />
              <Text style={{ fontSize: 18, color: '#333', marginLeft: 10 }}>Deezer</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                openYouTube((result as any).metadata.music[0].external_metadata.youtube.vid);
              }}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '80%',
                marginTop: 16,
                marginLeft: 'auto',
                marginRight: 'auto',
                height: 70,
                borderWidth: 1,
                borderColor: '#ccc',
                borderRadius: 25,
                paddingHorizontal: 20,
              }}>
              <Image source={require('./assets/youtube.png')} style={{ width: 30, height: 30 }} />
              <Text style={{ fontSize: 18, color: '#333', marginLeft: 10 }}>Youtube</Text>
            </Pressable>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
