theme.ProductGallery = (function() {

	function ProductGallery(container, productData) {

		var $container = $(container);
		var sectionId = $container.attr('data-section-id');

		var selectors = {
			productThumbs: '.product-single__thumbnails-' + sectionId,
			productThumbImages: '.product-single__thumbnail--' + sectionId,
			productThumbWraps: '.product-single__thumbnails-item',
			productImageWraps: '.product-single__photo',
			mobileImageCarousel: '.onyx-product__product-images',
		};

		var settings = {
			slideActive: false,
			mediaQueryMobile: 'screen and (max-width: 989px)',
			mediaQueryDesktop: 'screen and (min-width: 990px)',
			advancedVariantsEnabled: $container.hasClass('advanced-variant-images'),
			zoomEnabled: $(selectors.productImageWraps).hasClass('js-zoom-enabled')
		};

		var $imagesWrap = $(selectors.mobileImageCarousel);

		function isArray(obj) {
			return Object.prototype.toString.call(obj) === '[object Array]';
		}

		function arrayMap(arr, fn) {
			var returnArr = [];
			for (var i = 0; i < arr.length; i++) {
				returnArr[i] = fn(arr[i]);
			}
			return returnArr;
		}


		// State
		// -=-=-=-=-=-=-=-=-

		// The currently selected variant
		var currentVariant = null;		

		// The id's of all images attached to the product
		var parentGallery = arrayMap( $(selectors.productImageWraps), function(image) { return $(image).data('image-id'); });

		// The id's of the images that should be showing in the DOM gallery
		var gallery = parentGallery;

		// The id of the image currently active in the DOM
		var activeImg = $(selectors.productImageWraps + ':not(.hide)').data('image-id');

		// The primary image for the current set of product options.
		// Either the variant.featured_image or the product.featured_image
		var featuredImg = activeImg;


		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
		//	Product Image Zoom
		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

		function enableZoom(elem) {
			var zoomUrl = $(elem).data('zoom');
			$(elem).zoom({
			  url: zoomUrl,
			  target : '#onyx-zoom-box'
			});
		}

		function destroyZoom(elem) {
			$(elem).trigger('zoom.destroy');
		}


		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
		//	Update Images
		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-


		function getVariantImages() {

			var newGallery = gallery;
			var newFeaturedImg = 
				currentVariant && currentVariant.featured_image 		// If we have a valid variant
				? currentVariant.featured_image.id 							// new featured image is that variant's featured_image
				: featuredImg;											// else: its unchanged

			if (settings.advancedVariantsEnabled && currentVariant) {
				newFeaturedImg = currentVariant.imgData['img_main'].toString();

				if ( isArray(currentVariant.imgData['img_gallery_ids']) ) {
					newGallery = currentVariant.imgData['img_gallery_ids'];
					newGallery.unshift(newFeaturedImg);
				} else {
					newGallery = [ newFeaturedImg, currentVariant.imgData['img_gallery_ids'].toString() ];
				}
			}

			return {
				featuredImg: newFeaturedImg,
				gallery: newGallery
			}
		}

		function updateImages(forceGalleryUpdate) {

			var newState = getVariantImages();
	
			// Check if galleries are equal
			var galleriesEqual = gallery.length === newState.gallery.length;

			if (galleriesEqual) {
				$.each( gallery, function( index, galleryImg) {
					galleriesEqual = gallery[index] == newState.gallery[index];
					return galleriesEqual;
				});
			}

			// Update activeImage
			if( newState.featuredImg !== featuredImg ) {
				setActiveImage(newState.featuredImg);
				
				// Set Active Thumbnail 
				var thumb = $(selectors.productThumbImages + '[data-thumbnail-id="'+ newState.featuredImg +'"]')[0];
				setActiveThumb(thumb);
			}

			// Update Gallery
			if (!galleriesEqual || forceGalleryUpdate) {

				var	$galleryImages = $(selectors.productThumbWraps);

				// DESKTOP
				if ( !accelerate.onMobile() ) {	
					$galleryImages.hide().addClass('hide'); // Hide all gallery Images
					$galleryImages.each(function(index,image) { // Show the ones that apply
						var id = $(this).data('image-id').toString();
						if ( newState.gallery.indexOf(id) !== -1 ) $(image).show().removeClass('hide');
					});		
				}
				// MOBILE
				else { 	
					var $slider = $(selectors.mobileImageCarousel),
						$slides = $(selectors.mobileImageCarousel + ' .product-single__photo-wrapper');				
					
					// Remove Previous Filter
					$slider.slick('slickUnfilter');

					// Filter by New Variant Selection
					$slider.slick('slickFilter', function(index, slide) {
						return newState.gallery.indexOf( $(slide).data('image-id').toString() ) !== -1;
					});	
				} 
			}

			// Update State
			gallery = newState.gallery;
			featuredImg = newState.featuredImg;
		}

		function handleThumbClick(event) {
			event.preventDefault();

			// Update Thumbs
			setActiveThumb(this);

			// Update Active Image
			var imageId = $(this).data('thumbnail-id');
			setActiveImage(imageId);	
		}

		function setActiveThumb(thumb) {
			var activeClass = 'active-thumb';
			$(selectors.productThumbImages).removeClass(activeClass);
			$(thumb).addClass(activeClass);
		}

		function setActiveImage(imageId) {

			if (activeImg === imageId) return;

			var $newImage = $( // Image to show
				selectors.productImageWraps + "[data-image-id='" + imageId + "']",
				$container
			);
			
			var $otherImages = $( // Images to hide
				selectors.productImageWraps + ":not([data-image-id='" + imageId + "'])",
				$container
			);

			if ( !accelerate.onMobile() ) {
				$(selectors.productImageWraps).addClass('hide').hide();
				$newImage.removeClass('hide').show();
			}

			activeImg = imageId;
		}

		
		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
		//	Mobile Image Carousel
		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

		function initMobileCarousel() {
			if ( settings.slideActive ) return;

			// Init Slick
			$imagesWrap.slick(accelerate.slickSettings);	

			// Store image states
			$(selectors.productImageWraps).show();
			$(selectors.productImageWraps + '.hide').removeClass('hide').addClass('was-hidden');

			settings.slideActive = true;

			updateImages(true);
		}

		function destroyMobileCarousel() {
			if ( !settings.slideActive ) return;

			// Remove slick filters and unslick
			$imagesWrap.slick('slickUnfilter');
			$imagesWrap.slick('unslick');

			// Bring back image states
			$(selectors.productImageWraps + '.was-hidden').addClass('hide').removeClass('was-hidden');

			// make sure the right slide is selected -- TODO
			$(selectors.productThumbImages + '.active-thumb').click();

			settings.slideActive = false;

			updateImages(true);
		}


		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
		//	Init
		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

		// Mobile Only
		enquire.register(settings.mediaQueryMobile, {
			match: function() {

				// Destroy Image Zoom
				if (settings.zoomEnabled) {
					$(selectors.productImageWraps).each(function() {
						destroyZoom(this); //
					});
				}

				// Start Carousel
				initMobileCarousel();
			}
		});

		// Desktop Only
		enquire.register(settings.mediaQueryDesktop, {
			match: function() {

				// Destroy Carousel
				destroyMobileCarousel();

				// Enable Image Zoom
				if (settings.zoomEnabled) {
					$(selectors.productImageWraps).each(function() {
						enableZoom(this);
					});
				}	
			}
		});

		// Handle thumbnail clicks
		$(selectors.productThumbImages).click(handleThumbClick);


		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
		//	Handle New Variant
		// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

		function handleVariantChange(event) {
			
			// Update State
			currentVariant = event.variant;

			// Update UI
			updateImages();
		}

		$container.on(
			'variantChange',
			handleVariantChange
		);

	}

	return ProductGallery;
})();