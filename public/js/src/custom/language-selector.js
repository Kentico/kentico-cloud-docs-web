(() => {
    const updatePlatformInUrls = (platform) => {
        const links = document.querySelectorAll('[data-lang]');

        links.forEach(item => {
            const href = item.getAttribute('href').split('?');
            const path = href[0];
            let qs = href[1] ? href[1].split('#')[0] : null;
            const hash = href[1] ? href[1].split('#')[1] : null;

            if (qs) {
                qs = qs.split('&');
                qs = qs.map(item => {
                    if (item.indexOf('tech') === 0) {
                        item = 'tech=' + platform;
                    }
                    return item;
                });
                qs.join('&');
            } else {
                qs = 'tech=' + platform;
            }

            item.setAttribute('href', `${path}${qs ? '?' + qs : ''}${hash ? '#' + hash : ''}`);
        });
    };

    const highlightSelector = (articleContent, e) => {
        const fixedLabel = document.querySelector('.language-selector__label');
        let textTofixedLabel;
        let bgTofixedLabel;

        if (e) {
            window.helper.setCookie('KCDOCS.preselectedLanguage', e.target.getAttribute('data-platform'));
            articleContent.querySelectorAll('.language-selector__link--active').forEach(item => item.classList.remove('language-selector__link--active'));
            articleContent.querySelectorAll(`[data-platform=${e.target.getAttribute('data-platform')}]`).forEach(item => item.classList.add('language-selector__link--active'));
            updatePlatformInUrls(e.target.getAttribute('data-slug'));
            textTofixedLabel = e.target.innerHTML;
            bgTofixedLabel = e.target.getAttribute('data-icon');
        } else {
            const preselectedPlatform = window.helper.getCookie('KCDOCS.preselectedLanguage');
            const preselectedElem = document.querySelectorAll(`[data-platform="${preselectedPlatform}"]`);

            if (preselectedPlatform && preselectedElem.length) {
                preselectedElem.forEach(item => {
                    item.classList.add('language-selector__link--active');
                });

                textTofixedLabel = preselectedElem[0].innerHTML;
                bgTofixedLabel = preselectedElem[0].getAttribute('data-icon');
            } else {
                const firstPlatformElem = document.querySelectorAll('.language-selector__item:first-child .language-selector__link');
                firstPlatformElem.forEach(item => {
                    item.classList.add('language-selector__link--active');
                });

                if (firstPlatformElem.length) {
                    textTofixedLabel = firstPlatformElem[0].innerHTML;
                    bgTofixedLabel = firstPlatformElem[0].getAttribute('data-icon');
                }
            }
        }

        if (fixedLabel && textTofixedLabel) {
            fixedLabel.innerHTML = textTofixedLabel;
            fixedLabel.style.backgroundImage = `url('${bgTofixedLabel}')`;
        }
    };

    const getSelectedPlatform = (e) => {
        let selectedPlatform;

        if (e) {
            selectedPlatform = e.target.getAttribute('data-platform');
        } else {
            const activeLink = document.querySelector('.language-selector__link--active');
            if (activeLink) {
                selectedPlatform = activeLink.getAttribute('data-platform');
            }
        }

        return selectedPlatform;
    };

    const toggleBlock = (e, attribute, allowEmpty, selectorCompare) => {
        const selectedPlatform = getSelectedPlatform(e);
        let selectorToGetVisible = `[${attribute}${selectorCompare}"${selectedPlatform}"]`;

        if (allowEmpty) {
            selectorToGetVisible += `, [${attribute}=""]`;
        }
        document.querySelectorAll(`[${attribute}]:not([${attribute}=""])`).forEach(item => item.classList.add('hidden'));
        document.querySelectorAll(selectorToGetVisible).forEach(item => item.classList.remove('hidden'));
    }

    const selectCode = (e) => {
        toggleBlock(e, 'data-platform-code', false, '=');
    };

    const switchContentChunk = (e) => {
        toggleBlock(e, 'data-platform-chunk', true, '*=');
    };

    const removeParameterfromUrlSearch = (urlSearch, param) => {
        urlSearch = urlSearch.replace('?', '').split('&');
        urlSearch = urlSearch.filter(item => item.indexOf(param) !== 0 && item !== '');
        return urlSearch.length ? '?' + urlSearch.join('&') : '';
    };

    const replaceLanguageInUrl = (e) => {
        const selectedPlatform = e.target.getAttribute('data-slug');
        const url = window.location;
        let path = url.href.split(/[?#]/)[0];

        path = path + '?tech=' + selectedPlatform + removeParameterfromUrlSearch(url.search, 'tech').replace('?', '&') + url.hash;

        if (history && history.replaceState) {
            history.replaceState({}, null, path);
        }
    };

    const getScrollPosition = () => {
        const doc = document.documentElement;
        return window.pageYOffset || doc.scrollTop;
    };

    const getFirstElemInViewport = (selector) => {
        const elements = document.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i++) {
            if ((elements[i].getBoundingClientRect().top >= 0) && (elements[i].offsetWidth > 0 && elements[i].offsetHeight > 0)) {
                return elements[i];
            }
        }
        return null;
    };

    const actionLanguageOnClick = (e, articleContent) => {
        highlightSelector(articleContent, e);
        selectCode(e);
        switchContentChunk(e);
        replaceLanguageInUrl(e);
        document.querySelectorAll(`pre[data-platform-code=${e.target.getAttribute('data-platform')}] code`).forEach((item) => {
            window.Prism.highlightElement(item);
        });
    };

    const handleLanguageSelection = (e, articleContent) => {
        if (e.target && e.target.matches('.language-selector__link')) {
            e.preventDefault();

            let offsetTarget = e.target;
            let prevElemOffset;
            let scrollPosition;
            let newElemOffset;

            if (window.helper.findAncestor(offsetTarget, '.language-selector--fixed')) {
                offsetTarget = getFirstElemInViewport('.language-selector--code-block');
            }

            if (offsetTarget) {
                prevElemOffset = offsetTarget.getBoundingClientRect().top;
            }

            actionLanguageOnClick(e, articleContent);

            if (offsetTarget) {
                scrollPosition = getScrollPosition();
                newElemOffset = offsetTarget.getBoundingClientRect().top;
                window.scrollTo(0, scrollPosition - (prevElemOffset - newElemOffset));
            }
        }
    };

    const selectLanguageOnClick = (articleContent) => {
        articleContent.addEventListener('click', (e) => {
            handleLanguageSelection(e, articleContent);
        });
    };

    const copyCode = () => {
        const articleContent = document.querySelector('.article');

        if (articleContent) {
            const copyTooltips = articleContent.querySelectorAll('.infobar__tooltip');

            copyTooltips.forEach(item => {
                item.innerHTML = (window.UIMessages ? window.UIMessages.copyCode : '');
            });

            articleContent.addEventListener('click', (e) => {
                if (e.target && e.target.matches('.infobar__copy')) {
                    e.preventDefault();
                    const textElem = e.target.querySelector('.infobar__tooltip');
                    const text = textElem.innerHTML;
                    textElem.innerHTML = (window.UIMessages ? window.UIMessages.copyCodeActive : '');
                    setTimeout(() => {
                        textElem.innerHTML = text;
                    }, 1500);
                    const code = window.helper.findAncestor(e.target, 'pre').querySelector('.clean-code').innerHTML;
                    window.helper.copyToClipboard(window.helper.htmlDecode(code));
                }
            });
        }
    };

    const selectLanguage = () => {
        const articleContent = document.querySelector('.article');
        const selector = document.querySelectorAll('.language-selector__list:not(.language-selector__list--static)');

        if (selector.length) {
            highlightSelector();
            selectCode();
            switchContentChunk();
            selectLanguageOnClick(articleContent);
        } else {
            const fixedLabel = document.querySelector('.language-selector__label');
            const activeSelector = document.querySelector('.language-selector__link--active');
            if (fixedLabel && activeSelector) {
                fixedLabel.innerHTML = activeSelector.innerHTML;
                fixedLabel.style.backgroundImage = `url('${activeSelector.getAttribute('data-icon')}')`;
            }
        }
    };

    const makeInfobarsVisible = () => {
        const infobars = document.querySelectorAll('.infobar');

        if (infobars.length) {
            infobars.forEach(item => {
                item.classList.add('infobar--visible');
            });
        }
    };

    const findAndRemoveFromArray = (array, item) => {
        const index = array.indexOf(item);
        if (index > -1) {
          array.splice(index, 1);
        }
        return array;
    };

    const handleEmptyPlatforms = () => {
        const codeBlocks = document.querySelectorAll('.code-samples');
        const message = window.UIMessages && window.UIMessages.emptyCodeBlock ? window.UIMessages.emptyCodeBlock : 'We don\'t have a code sample for the selected technology.';
        const langSelector = document.querySelector('.language-selector__list');

        codeBlocks.forEach((block) => {
            let availablePlatforms = Array.prototype.slice.call(langSelector.querySelectorAll('[data-platform]')).map((item) => {
                return item.getAttribute('data-platform');
            });

            const availableCodeBlocks = Array.prototype.slice.call(block.querySelectorAll('[data-platform-code]')).map((item) => {
                return item.getAttribute('data-platform-code');
            });

            availableCodeBlocks.forEach((item) => {
                availablePlatforms = findAndRemoveFromArray(availablePlatforms, item);
            });

            let emptyBlocks = '';
            availablePlatforms.forEach((platform) => {
                emptyBlocks += `<pre class="code-samples__empty" data-platform-code="${platform}"><div class="code-samples__text">${message}</div></pre>`;
            });

            block.innerHTML = block.innerHTML + emptyBlocks;
        });
    };

    const handleAsideSelector = () => {
        const languageSelector = document.querySelector('.language-selector');

        if (languageSelector) {
            document.querySelector('body').addEventListener('click', (e) => {
                if (e.target && e.target.matches('.aside .language-selector__label')) {
                    if (languageSelector.classList.contains('language-selector--opened')) {
                        languageSelector.classList.remove('language-selector--opened');
                    } else {
                        languageSelector.classList.add('language-selector--opened');
                    }
                } else {
                    languageSelector.classList.remove('language-selector--opened');
                }
            });

            const links = languageSelector.querySelectorAll('.language-selector__link');
            for (let i = 0; i < links.length; i++) {
                links[i].style.backgroundImage = `url('${links[i].getAttribute('data-icon')}')`;
            }
        }
    };

    handleEmptyPlatforms();
    selectLanguage();
    copyCode();
    setTimeout(() => {
        makeInfobarsVisible();
    }, 0);
    handleAsideSelector();
})();
