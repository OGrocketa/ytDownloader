from pytubefix import YouTube

url = 'https://www.youtube.com/watch?v=-nwzc7plJQw'


def download(url):
    yt = YouTube(url)
    stream = yt.streams.get_highest_resolution()
    stream.download()

try:
    download(url)
except Exception as e:
    download(url)
    print("chuj")
        
