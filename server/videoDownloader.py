import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, quote
import re
import base64

def download_sign_video(word):
    # Convert word to uppercase for consistency
    word = word.upper()
    
    # Construct the URL with the word directly
    base_url = f"https://www.signingsavvy.com/sign/{quote(word)}"
    
    # Set up headers to mimic a browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        # Send GET request to the word page directly
        response = requests.get(base_url, headers=headers)
        response.raise_for_status()
        
        # Parse the page to find the video URL or multiple meanings
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # First check if we're on a search results page
        search_results = soup.find_all('a', href=re.compile(r'/sign/[^/]+'))
        if search_results:
            # Get the first result that matches our word
            for result in search_results:
                if word.lower() in result.get_text().lower():
                    first_result_url = urljoin("https://www.signingsavvy.com", result['href'])
                    print(f"Found search result, navigating to: {first_result_url}")
                    response = requests.get(first_result_url, headers=headers)
                    response.raise_for_status()
                    soup = BeautifulSoup(response.text, 'html.parser')
                    break
        
        # Check if we're on a multiple meaning page
        meaning_links = soup.find_all('a', href=re.compile(r'/sign/\d+/' + re.escape(word)))
        if not meaning_links:
            # Try alternative pattern for meaning links
            meaning_links = soup.find_all('a', href=re.compile(r'/sign/\d+/[^/]+'))
            
        if meaning_links:
            # If multiple meanings exist, get the first one
            first_meaning_url = urljoin("https://www.signingsavvy.com", meaning_links[0]['href'])
            print(f"Multiple meanings found, using the first one: {first_meaning_url}")
            
            # Get the specific meaning page
            response = requests.get(first_meaning_url, headers=headers)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
        
        # Try different methods to find the video
        video_url = None
        
        # Method 1: Look for video element
        video_element = soup.find('video')
        if video_element:
            video_url = video_element.get('src')
            if not video_url:
                source = video_element.find('source')
                if source:
                    video_url = source.get('src')
        
        # Method 2: Look for source elements directly
        if not video_url:
            source = soup.find('source')
            if source:
                video_url = source.get('src')
        
        # Method 3: Search for mp4 URL in the page source
        if not video_url:
            mp4_pattern = r'https?://[^\s<>"]+?\.mp4'
            matches = re.findall(mp4_pattern, response.text)
            if matches:
                video_url = matches[0]
        
        if video_url:
            # Ensure the URL is absolute
            video_url = urljoin(base_url, video_url)
            
            # Download the video
            print(f"Attempting to download from: {video_url}")
            video_response = requests.get(video_url, headers=headers)
            video_response.raise_for_status()
            
            # Convert to base64 and return
            video_base64 = base64.b64encode(video_response.content).decode('utf-8')
            print(f"Successfully downloaded video for '{word}'")
            return video_base64
        else:
            print(f"Could not find video URL for '{word}'. The video might require membership access.")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Error occurred while fetching the page: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == "__main__":
    # Example usage
    word = input("Enter a word to search for: ")
    download_sign_video(word)
