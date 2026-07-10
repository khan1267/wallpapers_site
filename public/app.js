/* ==========================================
   VIVIDWALL FRONTEND CONTROLLER (app.js)
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let activeCategory = 'All';
  let activeSearch = '';
  let activeSort = 'latest';
  let currentWallpapers = [];

  // --- ELEMENT SELECTORS ---
  const wallpaperGrid = document.getElementById('wallpaperGrid');
  const resultsCount = document.getElementById('resultsCount');
  const sectionTitle = document.getElementById('sectionTitle');
  const noResults = document.getElementById('noResults');
  
  // Search & Filter
  const searchInput = document.getElementById('searchInput');
  const sortBySelect = document.getElementById('sortBySelect');
  const categoriesBar = document.getElementById('categoriesBar');

  // Details Modal
  const detailsModal = document.getElementById('detailsModal');
  const detailsOverlay = document.getElementById('detailsOverlay');
  const btnCloseDetails = document.getElementById('btnCloseDetails');
  const modalImage = document.getElementById('modalImage');
  const modalCategory = document.getElementById('modalCategory');
  const modalTitle = document.getElementById('modalTitle');
  const modalTags = document.getElementById('modalTags');
  const modalResolution = document.getElementById('modalResolution');
  const modalSize = document.getElementById('modalSize');
  const modalDate = document.getElementById('modalDate');
  const modalDownloads = document.getElementById('modalDownloads');
  const btnDownloadWallpaper = document.getElementById('btnDownloadWallpaper');

  // Upload Modal
  const uploadModal = document.getElementById('uploadModal');
  const uploadOverlay = document.getElementById('uploadOverlay');
  const btnOpenUpload = document.getElementById('btnOpenUpload');
  const btnCloseUpload = document.getElementById('btnCloseUpload');
  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('fileInput');
  const dropzoneArea = document.getElementById('dropzoneArea');
  const dropzonePrompt = document.getElementById('dropzonePrompt');
  const dropzonePreview = document.getElementById('dropzonePreview');
  const uploadImgPreview = document.getElementById('uploadImgPreview');
  const btnRemovePreview = document.getElementById('btnRemovePreview');
  const uploadDimensionsInput = document.getElementById('uploadDimensions');
  const uploadMetaInfo = document.getElementById('uploadMetaInfo');
  const metaInfoSize = document.getElementById('metaInfoSize');
  const metaInfoResolution = document.getElementById('metaInfoResolution');
  const btnSubmitUpload = document.getElementById('btnSubmitUpload');
  
  // Toast container
  const toastContainer = document.getElementById('toastContainer');

  // --- INITIALIZE ---
  loadWallpapers();

  // --- API CALLS ---
  
  // Fetch wallpapers based on search, filter, and sort
  async function loadWallpapers() {
    renderSkeletons();
    
    const params = new URLSearchParams({
      category: activeCategory,
      search: activeSearch,
      sortBy: activeSort
    });

    try {
      const response = await fetch(`/api/wallpapers?${params.toString()}`);
      if (!response.ok) throw new Error('Network response error');
      
      const data = await response.json();
      currentWallpapers = data;
      renderWallpapers(data);
    } catch (error) {
      console.error('Error fetching wallpapers:', error);
      showToast('Connection Error', 'Failed to retrieve wallpapers from server.', 'error');
      wallpaperGrid.innerHTML = '';
      noResults.style.display = 'block';
    }
  }

  // Render shimmer card skeletons during loading
  function renderSkeletons() {
    noResults.style.display = 'none';
    wallpaperGrid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      wallpaperGrid.appendChild(skeleton);
    }
  }

  // Render wallpaper grid card elements
  function renderWallpapers(wallpapers) {
    wallpaperGrid.innerHTML = '';
    resultsCount.textContent = `${wallpapers.length} wallpaper${wallpapers.length !== 1 ? 's' : ''}`;
    
    // Update Section Title Context
    if (activeSearch) {
      sectionTitle.textContent = `Search Results for "${activeSearch}"`;
    } else {
      sectionTitle.textContent = activeCategory === 'All' ? 'All Wallpapers' : `${activeCategory} Wallpapers`;
    }

    if (wallpapers.length === 0) {
      noResults.style.display = 'block';
      return;
    }

    noResults.style.display = 'none';

    wallpapers.forEach((wp, index) => {
      const card = document.createElement('div');
      card.className = 'wallpaper-card';
      card.style.animationDelay = `${index * 0.05}s`;
      card.innerHTML = `
        <img src="/wallpapers/${wp.filename}" alt="${wp.title}" loading="lazy">
        <div class="card-overlay">
          <h3 class="card-title">${wp.title}</h3>
          <div class="card-meta-line">
            <span class="card-category">${wp.category}</span>
            <span class="card-quick-stats">
              <i class="fa-solid fa-download"></i> ${wp.downloads}
            </span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => openDetailsModal(wp));
      wallpaperGrid.appendChild(card);
    });
  }

  // --- DETAILS MODAL ---
  
  function openDetailsModal(wp) {
    modalImage.src = `/wallpapers/${wp.filename}`;
    modalImage.alt = wp.title;
    modalCategory.textContent = wp.category;
    modalTitle.textContent = wp.title;
    
    // Render Tags
    modalTags.innerHTML = '';
    if (wp.tags && wp.tags.length > 0) {
      wp.tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag-pill';
        span.textContent = `#${tag}`;
        modalTags.appendChild(span);
      });
    } else {
      modalTags.innerHTML = '<span class="tag-pill">#wallpaper</span>';
    }

    modalResolution.textContent = wp.dimensions;
    modalSize.textContent = wp.fileSize;
    
    // Format Date
    const uploadDate = new Date(wp.uploadDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    modalDate.textContent = uploadDate.toLocaleDateString(undefined, options);
    
    modalDownloads.innerHTML = `<i class="fa-solid fa-download"></i> ${wp.downloads}`;
    
    // Configure download button
    btnDownloadWallpaper.onclick = (e) => {
      e.preventDefault();
      triggerDownload(wp.id);
    };

    detailsModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock background scroll
  }

  function closeDetailsModal() {
    detailsModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Handle download trigger and local state increment
  function triggerDownload(wpId) {
    // Start actual download endpoint
    window.location.href = `/api/wallpapers/download/${wpId}`;
    
    // Increment downloads metric immediately on the client side for reactivity
    const wallpaper = currentWallpapers.find(w => w.id === wpId);
    if (wallpaper) {
      wallpaper.downloads += 1;
      modalDownloads.innerHTML = `<i class="fa-solid fa-download"></i> ${wallpaper.downloads}`;
      
      // Update download count on grid without reloading
      renderWallpapers(currentWallpapers);
    }
    
    showToast('Download Started', 'Wallpaper download has been initiated.', 'success');
  }

  // --- UPLOAD MODAL ---
  
  function openUploadModal() {
    uploadModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeUploadModal() {
    uploadModal.classList.remove('active');
    document.body.style.overflow = '';
    resetUploadForm();
  }

  function resetUploadForm() {
    uploadForm.reset();
    fileInput.value = '';
    dropzonePrompt.style.display = 'flex';
    dropzonePreview.style.display = 'none';
    uploadImgPreview.src = '';
    uploadDimensionsInput.value = 'Unknown';
    uploadMetaInfo.style.display = 'none';
    btnSubmitUpload.disabled = false;
    btnSubmitUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Publish Wallpaper</span>';
  }

  // Handle local file inspection (dimensions & size check)
  function handleFileSelection(file) {
    if (!file) return;

    if (!file.type.match('image.*')) {
      showToast('Invalid File', 'Please select an image file (PNG, JPG, WEBP, etc.)', 'error');
      fileInput.value = '';
      return;
    }

    // Read and preview file
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadImgPreview.src = e.target.result;
      dropzonePrompt.style.display = 'none';
      dropzonePreview.style.display = 'block';

      // Load image object to extract dimensions client-side
      const img = new Image();
      img.onload = () => {
        const dims = `${img.naturalWidth} x ${img.naturalHeight}`;
        uploadDimensionsInput.value = dims;
        metaInfoResolution.textContent = dims;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Calculate file size
    const bytes = file.size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    let sizeStr = '0 Byte';
    if (bytes > 0) {
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      sizeStr = Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
    }

    metaInfoSize.textContent = sizeStr;
    uploadMetaInfo.style.display = 'block';
  }

  // Dropzone Events
  dropzoneArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files[0]);
  });

  // Drag over dropzone
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzoneArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzoneArea.classList.add('drag-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzoneArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzoneArea.classList.remove('drag-active');
    }, false);
  });

  dropzoneArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelection(files[0]);
    }
  });

  btnRemovePreview.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUploadForm();
  });

  // Handle Wallpaper Upload Form Submission
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!fileInput.files[0]) {
      showToast('Upload Error', 'Please select a wallpaper image.', 'error');
      return;
    }

    btnSubmitUpload.disabled = true;
    btnSubmitUpload.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Uploading...</span>';

    const formData = new FormData(uploadForm);
    // Explicitly add dimensions calculated client side
    formData.set('dimensions', uploadDimensionsInput.value);

    try {
      const response = await fetch('/api/wallpapers', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server upload failed');
      }

      showToast('Success!', 'Wallpaper published successfully.', 'success');
      closeUploadModal();
      loadWallpapers(); // Reload grid
    } catch (error) {
      console.error('Submit error:', error);
      showToast('Upload Failed', error.message || 'Failed to publish wallpaper.', 'error');
      btnSubmitUpload.disabled = false;
      btnSubmitUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>Publish Wallpaper</span>';
    }
  });

  // --- FILTER & SEARCH HANDLERS ---

  // Category Pill Filter click
  categoriesBar.addEventListener('click', (e) => {
    if (e.target.classList.contains('category-pill')) {
      // Remove active from all
      document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
      // Add active to current
      e.target.classList.add('active');
      
      activeCategory = e.target.getAttribute('data-category');
      loadWallpapers();
    }
  });

  // Sort Selection change
  sortBySelect.addEventListener('change', (e) => {
    activeSort = e.target.value;
    loadWallpapers();
  });

  // Debounced Search Input
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      activeSearch = e.target.value.trim();
      loadWallpapers();
    }, 400); // 400ms debounce
  });

  // --- GENERAL EVENTS ---
  
  // Close Modals on Overlay Clicks
  detailsOverlay.addEventListener('click', closeDetailsModal);
  btnCloseDetails.addEventListener('click', closeDetailsModal);
  
  btnOpenUpload.addEventListener('click', openUploadModal);
  uploadOverlay.addEventListener('click', closeUploadModal);
  btnCloseUpload.addEventListener('click', closeUploadModal);

  // Close modals on ESC key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailsModal();
      closeUploadModal();
    }
  });

  // --- TOAST SYSTEM ---
  function showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Slide out and remove after 3.5s
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 3500);
  }

  // Set environment-aware footer status
  const footerText = document.getElementById('footerText');
  const footerStatus = document.getElementById('footerStatus');
  if (footerText && footerStatus) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      footerText.innerHTML = `&copy; 2026 VividWall. Saved locally at <code>F:\\Antigravity</code>`;
      footerStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Local Storage Active`;
      footerStatus.style.color = '#10b981';
    } else {
      footerText.innerHTML = `&copy; 2026 VividWall. Deployed on Vercel`;
      footerStatus.innerHTML = `<i class="fa-solid fa-cloud"></i> Serverless Mode Active`;
      footerStatus.style.color = '#38bdf8';
    }
  }
});
