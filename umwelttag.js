area=0;
		FMRAD=15;
		STATS=[];
		drawing = false;
		lastPflock=null;
		//mousepos=
		
		const trashcanIcon = L.divIcon({
    		html: '<i class="fas fa-dumpster fa-3x" style="color:red"></i>',
    		iconSize: [20, 20],
			className: 'trashcanIcon'
		});
		
		const rmIcon = L.divIcon({
			html: '<i class="far fa-times-circle fa-2x" style="color:red"></i>',
			iconSize: [20, 20],
			className: 'rmIcon'
		});
		
		const fpIcon = L.divIcon({
			html: '<i class="far fa-dot-circle fa-2x" style="color: #ffc107"></i>',
			iconSize: [20, 20],
			className: 'fpIcon'
		});
		
		const finishIcon = L.divIcon({
			html: '<i class="far fa-check-circle fa-2x" style="color:#28a745"></i>',
			iconSize: [20, 20],
			className: 'finishIcon'
		});
		
		const finishIconH = L.divIcon({
			html: '<i class="fas fa-check-circle fa-2x" style="color:#28a745"></i>',
			iconSize: [20, 20],
			className: 'finishIconH'
		});
		
		
		function loadConfig(){
			return $.get("api.php?action=get_config", function (data) {
				CONFIG=data["data"];
			}, "json")
				.fail(function () {
					alert("error loading config");
				});
		
		}
		
		function initLastPflock(latlng){
				lastPflock = L.marker(latlng, { radius: FMRAD, color:'red', opacity:1.0, icon: rmIcon });
				lastPflock.on('click', function(e){
					if(polyline.getLatLngs().length>2){
						console.log(this.getLatLng());
						var nA=polyline.getLatLngs().pop();
						//polyline.getLatLngs().pop();
						//polyline.getLatLngs().push(nA);
						//polyline.setLatLngs(polyline.getLatLngs().slice(0,-2));
						resetLastPflock();
						pHelpline({latlng: lastPflock.getLatLng()});
						//polyline.redraw();
					}else{
						pKill(e);
					}
		
				});	

				lastPflock.on('mouseover', function(e){
					$(".rmIcon>i").removeClass("far");
					$(".rmIcon>i").addClass("fas");
				});	
				lastPflock.on('mouseout', function(e){
					$(".rmIcon>i").removeClass("fas");
					$(".rmIcon>i").addClass("far");
				});	
				resetLastPflock();
		}
		
		function resetLastPflock(){
				if(polyline.getLatLngs().length>2){
					lastPflock.setLatLng(polyline.getLatLngs().slice(-2,-1)[0]);
				}else{
					lastPflock.setLatLng(polyline.getLatLngs()[0]);
				
				}
				lastPflock.addTo(map);
				
			
		}
		
		function showDeliveryPoints(){

			
			CONFIG["delivery_points"].forEach((val, key) => {
				console.log(val);
				val["marker"] = L.marker(val["pos"],{ icon:  trashcanIcon, zIndexOffset: 1360});
				val["marker"].bindTooltip('<span style="font-weight:bold">Sammelcontainer:</span><br>'+val["name"],{className:'particTt'});
				val["marker"].addTo(map);
			});
			
		}


		// Example starter JavaScript for disabling form submissions if there are invalid fields
		function initValidation() {
			'use strict'
			// Fetch all the forms we want to apply custom Bootstrap validation styles to
			var forms = document.querySelectorAll('.needs-validation')

			// Loop over them and prevent submission
			Array.prototype.slice.call(forms)
				.forEach(function (form) {
					form.addEventListener('submit', function (event) {
						if (!form.checkValidity()) {
							event.preventDefault()
							event.stopPropagation()
							console.log('invalid');
						}

						form.classList.add('was-validated')
					}, false)
				});
		}





	
		
		function pRemove() {
			//remove the polygon if submission is cancelled / popup closed
			polygon.remove();
			polygon = null;
			console.log("popupclosed");
		}
		
		function pKill(e) {
			if (drawing) {
				L.DomEvent.stopPropagation(e);
				drawing = false;
				polyline.remove();
				polyline=null;
				firstPflock.remove();
				lastPflock.remove();
				firstPflock=null;
				lastPflock=null;
			}
		}

		function submitCleaning() {
			var lls = [];

			//if(!validate())
			//	return;
			
			if(!$('#cleanreg')[0].checkValidity())
				return;
			
			polygon.getLatLngs()[0].forEach((val, key) => {
				lls.push([val["lat"], val["lng"]]);



			});


			$.get("api.php"
				, { action: "add", name: $("#inputName").val(), mail: $("#inputEmail").val(), pflocks: JSON.stringify(lls) }
				, function (data) {
					console.log("cleaning sent");
					popup.remove();
					alert("Danke für's mitmachen! Bitte Teilnahme per Email bestätigen!");
				}, "json")
				.fail(function () {
					alert("error:"+data["msg"]);
				});


		}

		function pixelDistance(latlngA, latlngB) {
			var pA = map.latLngToLayerPoint(latlngA);
			var pB = map.latLngToLayerPoint(latlngB);
			return pA.distanceTo(pB);
		}

		function loadCleaningAreas() {
			return $.get("api.php?action=list", function (d) {
				var data=d["data"];
				//console.log(data[0]["name"]);
				STATS["participants"]=data.length;
				STATS["sum_area_cleaned"]=0;
				STATS["sum_area_reserved"]=0;
				data.forEach((val, key) => {
					console.log(key);
					

					
					
					var poly = L.polygon(val["polygon"], { color: '#28a745', dashArray: "5,6" , fillOpacity: 0.18});
					
					var area = Math.round(turf.area(poly.toGeoJSON()));
					val["area_ha"]=area/10000;
					
					var addcls='';
					if(val["status"]=="done"){
						var dicon="far fa-check-circle greenicon";
						addcls=' done';
						poly.setStyle({
							dashArray: null,
							fillOpacity: 0.7
						});
						STATS["sum_area_cleaned"]+=val["area_ha"];
					}else{
						var dicon="far fa-clock yellowicon";
						STATS["sum_area_reserved"]+=val["area_ha"];
					}
					
					poly.addTo(map);

					
					STATS["sum_area"]+=val["area_ha"];
					if(area>=10000)
						area=""+Math.round(area*100/10000.0)/100+" ha"; //rounding 1 place after decimal dot hack
					else
						area=""+Math.round(area)+" m²";
						
					
					poly.bindTooltip('<span id="tooltip-'+key+'" class="tooltipname compact">'+val["name"]+"</span> ("+area+') <i class="fa-2x '+dicon+'"></i>', { className:'particTt'+addcls, permanent: true }).openTooltip();
					
					poly.on('mouseover', function(){
						console.log(poly.getTooltip());
						$('#tooltip-'+key).addClass( "full" );
						$('#tooltip-'+key).removeClass( "compact" );
					
					});
					
					poly.on('mouseout', function(){
						console.log(poly.getTooltip());
						$('#tooltip-'+key).addClass( "compact" );
						$('#tooltip-'+key).removeClass( "full" );
					
					});
				});


				//$( ".result" ).html( data );
				//alert( "Load was performed." );
			}, "json")
				.fail(function () {
					alert("error loading");
				});

		}

		function pFinish(e){
		
			//restrict to small, wellformed areas; at least 3 (+1 invisible) pflocks are needed
			if(!isPolyValid() || polyline.getLatLngs().length < 4){
				return;
			}
			
			drawing = false;
				
			polygon = L.polygon(polyline.getLatLngs().slice(0, -1), { color: '#28a745', dashArray: "5,6" }).addTo(map);

			var ed = new Date(CONFIG['date']);
			popup = L.popup(polygon)
					.setLatLng(polygon.getCenter())
					.setContent('<h5>Am ' + ed.getDate() + '.' +(ed.getMonth()+1)+ ". mach' ich hier sauber!</h5>"+
`<form id="cleanreg" class="needs-validation" novalidate >
	<div class="mb-3 form-floating">
		<input type="text" class="form-control" id="inputName" placeholder="John Doe" required>
		<label for="inputName">Name</label>
		<div id="invalidNameFeedback" class="invalid-feedback">
			(Spitz-)Namen eingeben!
		</div>
	</div>
	<div class="mb-3 form-floating">
		<input type="email" class="form-control" id="inputEmail" placeholder="johndoe@example.com" required>
		<label for="inputEmail">Emailadresse</label>
		<div id="invalidEmailFeedback" class="invalid-feedback">
			Gültige Emailadresse eingeben!
		</div>
    </div>
	<div>
    <div id="emailHelp" class="form-text">Email wird nicht dauerhaft gespeichert oder öffentl. angezeigt</div>
	<div class="container">
	<div class="row">
	<button type="button" class="btn btn-primary col-md-7" id="btnSubmitCleaning">Senden!</button>
	<button class="btn btn-secondary col-md-5" id="btnCancelCleaning">Abbruch!</button>
	</div></div>
</div></form>
`)
			.openOn(map);


			initValidation();
				
			popup.on('remove', pRemove);
			polyline.remove();
			firstPflock.remove();
			firstPflock=null;
			lastPflock.remove();
			lastPflock=null;

			$("#btnSubmitCleaning").on('click', submitCleaning);
			$("#btnCancelCleaning").on('click', function(){popup.remove();});
			
		
		
		}
		
		function pPflock(e) {
			if (!drawing) {
				polyline = L.polyline([e.latlng], { color: '#ffc107', fill: true, dashArray: 4, bubblingMouseEvents: false }).addTo(map);
				
				firstPflock = L.marker(polyline.getLatLngs()[0], { icon: fpIcon, color:'#ffc107', opacity:1.0,bubblingMouseEvents: false }).addTo(map);
				firstPflock.on('click', pFinish);
				initLastPflock(firstPflock.getLatLng());
				
				mousetip=L.marker(e.latlng,{opacity: 0.001}).addTo(map);
				mousetip.bindTooltip('Flächengröße muss zwischen 100 und '+(CONFIG["area_maxsize_qm"])+' qm liegen.<br> Deine Fläche ist aktuell <span id="areadisplay"></span> qm groß.');
				drawing = true;
			}
			
			polyline.addLatLng(e.latlng);
			resetLastPflock();
			
			pHelpline(e);
			

			
		}

		function isPolyValid(){
			var a=polyline.getLatLngs()
			var mpoly=L.polygon(polyline.getLatLngs());
			area = Math.round(turf.area(mpoly.toGeoJSON()));
			kinks = turf.kinks(mpoly.toGeoJSON()).features;
			
			//fix for touch devices setting the previewmarker via phelpline right on the last pflock and causing a kink
			if(a.length>=3 && L.latLng(a[a.length-1]).distanceTo(a[a.length-2])<1){
				kc=kinks.length-1;
			}else{
				kc=kinks.length;
			}
			
			return (area<=CONFIG["area_maxsize_qm"] && area>100 && polyline.getLatLngs().length >= 3 && kc==0)
		
		}



		function pHelpline(e) {
			if (drawing) {
				var a = polyline.getLatLngs();
				mousetip.setLatLng(e.latlng);
				a[a.length - 1] = e.latlng;
				
				if (a.length > 3 && pixelDistance(e.latlng, a[0]) < FMRAD) {
						a[a.length - 1] = firstPflock.getLatLng();
				}
				
				mousetip.closeTooltip();
				//check for valid size & form
				if(isPolyValid()){
					
					//mouseover firstpflock: highlight & snap
					if (a.length > 3 && pixelDistance(e.latlng, a[0]) < FMRAD) {
						firstPflock.setIcon(finishIconH);
					} else {
						firstPflock.setIcon(finishIcon);
					}
					var plstyle={color: '#28a745'};
				}else{
					//only show hint after scnd line in the making
					if(polyline.getLatLngs().length >= 3){
							
						mousetip.openTooltip();$("#areadisplay").text(""+area);
						//console.log(kinks);
						//console.log(polyline.getLatLngs())
					}
					
					firstPflock.setIcon(fpIcon);
					var plstyle={color: '#ffc107'};
				}

				
				polyline.setStyle(plstyle)
				polyline.redraw();
			}
		}

		$(document).ready(function () {
			console.log("ready!");
			
			
			
			
			map = L.map('map', {
				tap: false,
				attributionControl: false
			});
			
			loadConfig()
				.done(function(){
					$("h1#title").html(CONFIG["name"]);
					$("span#title").html(CONFIG["description"]);
					$("h5#subtitle").html(CONFIG["subtitle"]);
					$("div#impprint").html(CONFIG["impressum"]);
					
					showDeliveryPoints();
					
					$("div#tab_frame>#statistik").hide();
					$("div#tab_frame>#impinfo").hide();
					$("a#nav_undsogehts").on('click', function(){
						$("ul#infonav a.active").removeClass("active");
						$("a#nav_undsogehts").addClass("active");
						$("div#tab_frame>*").hide();
						$("div#tab_frame>#undsogehts").show();
					});
					$("a#nav_impressum").on('click', function(){
						$("ul#infonav a.active").removeClass("active");
						$("a#nav_impressum").addClass("active");
						$("div#tab_frame>*").hide();
						$("div#tab_frame>#impressum").show();
					});
					loadCleaningAreas()
						.done(function(){
						
							//do stats
							$("#statistik #area_reserved").html((Math.round(10*STATS["sum_area_reserved"])/10.0)+" ha");
							$("#statistik #area_cleaned").html((Math.round(10*STATS["sum_area_cleaned"])/10.0)+" ha");
							$("#statistik #participants").html(STATS["participants"]);
							
							$("a#nav_statistik").on('click', function(){
								$("ul#infonav a.active").removeClass("active");
								$("a#nav_statistik").addClass("active");
								$("div#tab_frame>div").hide();
								$("div#tab_frame>#statistik").show();
							});
							
							
						});
					map.setView([CONFIG["center"][0], CONFIG["center"][1]], CONFIG["center"][2]);
					
			});
			
			
			

			

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(map);

			L.control.attribution({
				position: 'topright'
			}).addTo(map);

			map.on('click', pPflock);

			map.on('mousemove', pHelpline);
			
			
			var muell=0;
			$("#bauhoflink").on('click', function () { 
				var mm=CONFIG["delivery_points"][(muell++)%CONFIG["delivery_points"].length]["marker"];
				map.setView(mm.getLatLng(),15);
				mm.openTooltip();
			});

			$("#toggle-info").on('click', function () {
				$("#infobar").toggle();
				$("#infobar").toggleClass("d-none");
				$("#mapscreen").toggleClass("d-none");
				if ($("#infobar").is(":visible")) {
					$("#toggle-info").html("zur Karte!")
				} else {
					$("#toggle-info").html("zum Infotext!");
					map.invalidateSize();
				}
			});
		});