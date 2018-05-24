var app = angular.module('app', []);

app
    .component('mainComponent', {
        template: templateForMainComponent,
        controller: ['backend', controllerForMainComponent]
    })
    .component('toDo', {
        template: teamplateForToDoComponent,
        controller: ['$interval', controllerForToDoComponent],
        bindings: {
            items: '<',
            totalCount: '<',
            maxId: '<'
        }
    })
    .service('backend', ['$http', '$q', backendService])
    .filter('reverseItems', [mainFilter]);


// MAIN COMPONENT

/**
 *
 * @returns {string}
 */
function templateForMainComponent() {
    return [
        '<h2 ng-if="$ctrl.loading">Loading...</h2>',
        '<h2 ng-if="$ctrl.loadingError" style="color: red">Error</h2>',
        '<h2 ng-if="$ctrl.noNameError">Enter repository name</h2>',
        '<input type="text" ',
        'ng-model="$ctrl.searchStr" ',
        'ng-style="{\'border\': $ctrl.inputError ? \'3px solid red\' : \'\'}" ',
        'ng-model-options="{\'debounce\': 200}" ',
        'ng-change="$ctrl.submitFilter()">',
        '<to-do items="$ctrl.items" total-count="$ctrl.totalCount" max-id="$ctrl.maxId"></to-do>'
    ].join("");
}

/**
 *
 * @param backend
 */
function controllerForMainComponent(backend) {
    var ctrl = this;

    ctrl.submitFilter = submitFilter;

    ctrl.loading = false;
    ctrl.searchStr = 'js';
    ctrl.noNameError = false;
    ctrl.loadingError = false;
    ctrl.inputError = false;

    this.$onInit = function () {
        submitFilter();
    };

    function submitFilter() {
        // проверка поискового запроса на пустоту
        if (!ctrl.searchStr) {
            ctrl.noNameError = true;

            return;
        }

        ctrl.noNameError = false;

        // проверка поискового запроса на наличие только латинских символов
        var latinLettersRegexp = new RegExp('^[a-zA-Z]+$');
        if (!latinLettersRegexp.test(ctrl.searchStr)) {
            ctrl.inputError = true;

            return;
        }

        ctrl.inputError = false;

        // отменяем реквест, если загрузка уже идёт
        if (ctrl.loading) {
            backend.abortRequest();
        }

        ctrl.loading = true;

        // отправляем запрос
        backend.getItems(ctrl.searchStr)
            .then(function (response) {
                ctrl.items = response.data.items;
                ctrl.totalCount = response.data.total_count;
                ctrl.maxId = getMaxId(ctrl.items);
                ctrl.loading = false;
                ctrl.loadingError = false;
            })
            .catch(function (response) {
                ctrl.loading = false;

                // при частых запросах гитхаб ругается, лучше обработать
                if (response.status === 403) {
                    ctrl.loadingError = true;
                }
            });
    }

    /**
     * получаем максимальный id
     * @param items
     * @returns {string}
     */
    function getMaxId(items) {
        var ids = items.map(function (item) {
            return item.id;
        });

        return ids.length > 0 ? Math.max.apply(null, ids) : '-';
    }
}

// TO DO COMPONENT

/**
 *
 * @returns {string}
 */
function teamplateForToDoComponent() {
    return [
        '<div>Current time: {{$ctrl.time}}</div>',
        '<div ng-if="$ctrl.items">Total count: {{$ctrl.totalCount}}</div>',
        '<div ng-if="$ctrl.items">Current count: {{$ctrl.todosLength}}</div>',
        '<div ng-if="$ctrl.items">Max Id: {{$ctrl.maxId}}</div>',
        '<div ng-if="$ctrl.selectedId && $ctrl.items">Selected Id: {{$ctrl.selectedId}}</div>',
        '<div>Items:</div>',
        '<div ng-repeat="todo in $ctrl.items | reverseItems" ng-if="$index % 2 === 0">',
        '<span ng-click="$ctrl.selectId(todo)">{{$ctrl.todosLength - $index}}) {{todo.full_name}}</span>',
        '</div>'
    ].join('');
}

/**
 *
 * @param $interval
 */
function controllerForToDoComponent($interval) {
    var ctrl = this;
    ctrl.selectId = selectId;

    this.$onInit = function () {
        updateTime();
        $interval(updateTime, 1000);
    };

    this.$onChanges = function (changes) {
        if (changes.items && !changes.items.isFirstChange()) {
            ctrl.todosLength = changes.items.currentValue.length;
        }
    };

    function updateTime() {
        var now = new Date();

        ctrl.time = now.toString();
    }

    function selectId(item) {
        ctrl.selectedId = item.id;
    }
}

// BACKEND

/**
 *
 * @param $http
 * @param $q
 * @returns {backendService}
 */
function backendService($http, $q) {
    const service = this;

    service.getItems = getItems;
    service.abortRequest = abortRequest;

    function getItems(searchStr) {
        this.cancelRequest = $q.defer();

        return $http({
            url: 'https://api.github.com/search/repositories',
            method: 'GET',
            params: {q: searchStr},
            timeout: this.cancelRequest.promise
        });
    }

    function abortRequest() {
        this.cancelRequest.resolve();
    }

    return service;
}

// FILTER

/**
 *
 * @returns {Function}
 */
function mainFilter() {
    return function (items) {
        if (!items) {
            return;
        }

        return items.slice().reverse();
    };
}