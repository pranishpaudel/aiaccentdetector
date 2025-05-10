import torchaudio
import os
from speechbrain.pretrained import EncoderClassifier

# Print available backends for debugging
print(f"Available torchaudio backends: {torchaudio.list_audio_backends()}")
print(f"Current backend: {torchaudio.get_audio_backend()}")

# Load the pre-trained accent classification model
print("Loading model...")
classifier = EncoderClassifier.from_hparams(
    source="Jzuluaga/accent-id-commonaccent_ecapa",
    savedir="pretrained_models/accent-id-commonaccent_ecapa"
)

def classify_accent(wav_path):
    try:
        print(f"Processing file: {wav_path}")
        if not os.path.exists(wav_path):
            print(f"File not found: {wav_path}")
            return
            
        # Print file info
        info = torchaudio.info(wav_path)
        print(f"Audio file info: {info}")
        
        # Classify the accent
        out_prob, score, index, text_lab = classifier.classify_file(wav_path)
        
        # Format and print the result
        result = {
            'accent': text_lab[0],
            'score': float(score.item() * 100)
        }
        print(result)
    except Exception as e:
        print({'error': str(e)})
        import traceback
        traceback.print_exc()

# Look for WAV files in the current directory
if os.path.exists("/data"):
    wav_files = [f for f in os.listdir("/data") if f.endswith('.wav')]
    if wav_files:
        for wav_file in wav_files:
            wav_path = os.path.join("/data", wav_file)
            print(f"\nProcessing: {wav_file}")
            classify_accent(wav_path)
    else:
        print("No WAV files found in /data directory")
else:
    print("/data directory not found. Using default example file.")
    # Example usage with a default path
    wav_path = "./heroin.wav"  # This would be mounted in Docker
    if os.path.exists(wav_path):
        classify_accent(wav_path)
    else:
        print(f"Default file not found: {wav_path}")