var example = angular.module('starter', ['ionic', 'ngCordova'])
    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

                cordova.plugins.Keyboard.disableScroll(true);
            }
            if (window.StatusBar) {
                StatusBar.styleDefault();
            }
        });
    });

example.controller('MapaController', ['$scope', '$ionicLoading', '$http', '$window', '$state', '$cordovaGeolocation', function ($scope, $ionicLoading, $http, $window, $state, $cordovaGeolocation) {
    var self = this;
    var initialLocation;
    self.geolocationDesativada = false;

    $ionicLoading.show({
        template: 'Carregando focos de dengue...'
    });

    self.recarregarPagina = function () {
        $window.location.reload(true);
        self.geolocationDesativada = false;
    };

    google.maps.event.addDomListener(window, 'load', function () {

        self.mapa = '';
        self.vaiDescrever = false;
        self.coordenadasClicadas = {
            lat: 1,
            lng: 1
        };
        self.descricaoDoFoco = '';

        self.cancelarDescricao = function () {
            self.vaiDescrever = false;
        };

        function adicionarCampoDescricao() {
            $scope.$apply(function () {
                self.vaiDescrever = true;
            });
        }

        function adicionarBotaoMinhaLocalizacao(mapa, initialLocation) {
            var controlDiv = document.createElement('div');

            var firstChild = document.createElement('button');
            firstChild.style.backgroundColor = '#fff';
            firstChild.style.border = 'none';
            firstChild.style.outline = 'none';
            firstChild.style.width = '28px';
            firstChild.style.height = '28px';
            firstChild.style.borderRadius = '2px';
            firstChild.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
            firstChild.style.cursor = 'pointer';
            firstChild.style.marginRight = '10px';
            firstChild.style.padding = '0';
            firstChild.title = 'Sua localização';
            controlDiv.appendChild(firstChild);

            var secondChild = document.createElement('div');
            secondChild.style.margin = '5px';
            secondChild.style.width = '18px';
            secondChild.style.height = '18px';
            secondChild.style.backgroundImage = 'url(https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-2x.png)';
            secondChild.style.backgroundSize = '180px 18px';
            secondChild.style.backgroundPosition = '0 0';
            secondChild.style.backgroundRepeat = 'no-repeat';
            firstChild.appendChild(secondChild);

            google.maps.event.addListener(mapa, 'center_changed', function () {
                secondChild.style['background-position'] = '0 0';
            });

            firstChild.addEventListener('click', function () {
                mapa.setCenter(initialLocation);
            });

            controlDiv.index = 1;
            mapa.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
        }

        function adicionarRaioDoFoco(mapa, latLng, raio) {
            new google.maps.Circle({
                map: mapa,
                radius: raio,
                center: latLng,
                fillColor: '#AA6F39',
                fillOpacity: 0.3,
                strokeColor: '#AB5709',
                strokeOpacity: 0.7,
                strokeWeight: 2,
                clickable:false
            });
        }
        
        function adicionarJanelaDeInformacao(mapa, marcador, descricaoDoFoco) {
            var infoWindow = new google.maps.InfoWindow({
                content: descricaoDoFoco
            });

            google.maps.event.addListener(marcador, 'click', function () {
                infoWindow.open(mapa, marcador);
            });
        }

        function adicionarFoco(mapa, latLng, descricaoDoFoco, raio) {
            var image = 'img/map-marker.png';
            var marcador = new google.maps.Marker({
                position: latLng,
                map: mapa,
                animation: google.maps.Animation.DROP,
                title: descricaoDoFoco,
                icon: image
            });
            adicionarJanelaDeInformacao(mapa, marcador, descricaoDoFoco);
            adicionarRaioDoFoco(mapa, latLng, raio);
        }

        function adicionarMarcadorNoBanco(coordenadas, descricaoDoFoco) {
            var focoDeDengueASerCadastrado = {
                latitude: coordenadas.lat,
                longitude: coordenadas.lng,
                descricao: descricaoDoFoco
            };
            $http.post('https://patrulha-da-dengue.herokuapp.com/focos', focoDeDengueASerCadastrado);
        }

        self.confirmarDescricao = function () {
            self.vaiDescrever = false;
            adicionarMarcadorNoBanco(self.coordenadasClicadas, self.descricaoDoFoco);
            adicionarFoco(self.mapa, self.coordenadasClicadas, self.descricaoDoFoco, 100);
        };

        function iniciarMapa(focosDeDengue) {

            var zoomPadrao = 17;

            var campoGrande = {
                lat: -19.55722,
                lng: -53.35361
            };

            self.mapa = new google.maps.Map(document.getElementById('mapa'), {
                zoom: zoomPadrao,
                streetViewControl: true,
                disableDoubleClickZoom: true,
                mapTypeId: google.maps.MapTypeId.SATELLITE
            });

            var options = {
                timeout: 10000,
                enableHighAccuracy: true
            };
            $cordovaGeolocation.getCurrentPosition(options).then(function (position) {
                initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                self.mapa.setCenter(initialLocation);
                self.geolocationDesativada = false;
                adicionarBotaoMinhaLocalizacao(self.mapa, initialLocation);
            }, function (error) {
                self.geolocationDesativada = true;
            });

            var i, coordenadas;
            for (i = 0; i < focosDeDengue.length; i++) {
                coordenadas = {
                    lat: focosDeDengue[i].latitude,
                    lng: focosDeDengue[i].longitude
                };
                var raio = focosDeDengue[i].raioDoFoco;
                var descricao = focosDeDengue[i].descricao;
                adicionarFoco(self.mapa, coordenadas, descricao, raio);
            }

            self.mapa.addListener("click", function (event) {
                adicionarCampoDescricao();
                self.coordenadasClicadas = {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                };
            });
        }

        $http({
            method: 'GET',
            url: 'https://patrulha-da-dengue.herokuapp.com/focos/'
        }).then(function successCallback(response) {
            iniciarMapa(response.data);
            $ionicLoading.hide();
        }, function errorCallback() {
            $log.error('Não foi possível encontrar os focos');
        });
    });

}]);
