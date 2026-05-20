import cv2
import numpy as np
from skimage.feature import local_binary_pattern
from skimage.metrics import structural_similarity as ssim

class ImageProcessor:
    def __init__(self):
        # Local Binary Pattern parameters for texture analysis
        self.lbp_radius = 3
        self.lbp_no_points = 8 * self.lbp_radius

    def analyze_material(self, image_bytes: bytes) -> dict:
        """
        Processes image bytes, runs CV algorithms to extract features,
        and returns a dictionary of metrics.
        """
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Could not decode image")
            
        # 1. Preprocessing (Resize, Denoise)
        img_resized = cv2.resize(img, (512, 512))
        img_denoised = cv2.fastNlMeansDenoisingColored(img_resized, None, 10, 10, 7, 21)
        
        # Convert to Grayscale for texture and structure analysis
        gray = cv2.cvtColor(img_denoised, cv2.COLOR_BGR2GRAY)
        
        # 2. Edge Enhancement (Sharpening to detect weave)
        kernel = np.array([[0, -1, 0], 
                           [-1, 5,-1], 
                           [0, -1, 0]])
        img_sharpened = cv2.filter2D(gray, -1, kernel)
        
        # 3. Texture Analysis (LBP)
        lbp = local_binary_pattern(gray, self.lbp_no_points, self.lbp_radius, method="uniform")
        (hist, _) = np.histogram(lbp.ravel(), bins=np.arange(0, self.lbp_no_points + 3), range=(0, self.lbp_no_points + 2))
        
        # Normalize histogram
        hist = hist.astype("float")
        hist /= (hist.sum() + 1e-7)
        texture_score = float(np.mean(hist) * 1000) # Pseudo-score for demo
        
        # 4. Weave Pattern consistency (using Edge density)
        edges = cv2.Canny(img_sharpened, 100, 200)
        edge_density = float(np.sum(edges > 0) / (512 * 512))
        pattern_score = edge_density * 100
        
        # 5. Quality Score (Contrast + Blur/Focus metric)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        quality_score = min(max(laplacian_var / 1000.0 * 100, 0), 100) # Scaled
        
        # In a real system, we'd compare SSIM against a DB.
        # For MVP, we simulate a 70-95 similarity score vs "ideal reference".
        sim_score = max(min(70 + (texture_score * 0.1) + (pattern_score * 0.5), 98), 65)

        return {
            "similarity_score": round(sim_score, 1),
            "texture_analysis": f"{'Fine' if texture_score > 50 else 'Coarse'} texture pattern detected",
            "pattern_analysis": f"{'Tight' if pattern_score > 15 else 'Loose'} weave structure",
            "quality_score": round(quality_score, 1),
            "quality_status": "High" if quality_score > 60 else "Average",
        }
