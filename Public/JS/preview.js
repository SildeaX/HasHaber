document.addEventListener('DOMContentLoaded', function () {
    const titleInput = document.getElementById('news-posting-title');
    const imageInput = document.getElementById('news-posting-image-url');
    const contentInput = document.getElementById('news-posting-content');

    const previewTitle = document.getElementById('preview-title');
    const previewImage = document.getElementById('preview-image');
    const previewContent = document.getElementById('preview-content');

    titleInput.addEventListener('input', function () {
        previewTitle.textContent = titleInput.value || 'Title will be displayed here';
    });

    imageInput.addEventListener('input', function () {
        if (imageInput.value) {
            previewImage.src = imageInput.value;
            previewImage.style.display = 'block';
        } else {
            previewImage.src = '';
            previewImage.style.display = 'none';
        }
    });

    contentInput.addEventListener('input', function () {
        previewContent.textContent = contentInput.value || 'Content will be displayed here';
    });

});