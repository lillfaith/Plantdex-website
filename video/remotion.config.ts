import { Config } from '@remotion/cli/config';

// The unpacked ad asset pack IS the public directory, so `staticFile()` can reach nothing
// else: an ad cannot quietly pull an image from the website's own `public/`.
Config.setPublicDir('./assets/plantdex-ad-assets');
Config.setVideoImageFormat('png');
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setCrf(16);
Config.setConcurrency(4);
