(function () {
    if (localStorage) {
        if (localStorage.getItem('KCDOCS.cookieBar') !== 'true') {
            var bar = '<div class="cookie-bar js-cookie-bar"><div class="cookie-bar__container"><div class="cookie-bar__inner"><div class="cookie-bar__text"></div><div class="cookie-bar__close js-cookie-bar__close">×</div></div></div></div>';
            document.querySelector('.footer').insertAdjacentHTML('afterend', bar);

            if (UIMessages && UIMessages.cookieBar) {
                document.querySelector('.cookie-bar__text').innerHTML = helper.decodeHTMLEntities(UIMessages.cookieBar);
            }
        }

        var closeEl = document.querySelector('.js-cookie-bar__close');

        if (closeEl !== null) {
            closeEl.addEventListener('click', function () {
                var barEl = document.querySelector('.js-cookie-bar');
                barEl.parentNode.removeChild(barEl);
                localStorage.setItem('KCDOCS.cookieBar', 'true');
            });
        }
    }
})();
