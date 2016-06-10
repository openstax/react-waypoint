'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var POSITIONS = {
  above: 'above',
  inside: 'inside',
  below: 'below',
  invisible: 'invisible'
};

var propTypes = {
  debug: _react.PropTypes.bool,
  // threshold is percentage of the height of the visible part of the
  // scrollable ancestor (e.g. 0.1)
  threshold: _react.PropTypes.number,
  onEnter: _react.PropTypes.func,
  onLeave: _react.PropTypes.func,
  onPositionChange: _react.PropTypes.func,
  fireOnRapidScroll: _react.PropTypes.bool,
  scrollableAncestor: _react.PropTypes.any,
  throttleHandler: _react.PropTypes.func
};

var defaultProps = {
  threshold: 0,
  onEnter: function onEnter() {},
  onLeave: function onLeave() {},
  onPositionChange: function onPositionChange() {},

  fireOnRapidScroll: true,
  throttleHandler: function throttleHandler(handler) {
    return handler;
  }
};

function debugLog() {
  console.log(arguments); // eslint-disable-line no-console
}

/**
 * Calls a function when you scroll to the element.
 */

var Waypoint = function (_React$Component) {
  _inherits(Waypoint, _React$Component);

  function Waypoint() {
    _classCallCheck(this, Waypoint);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(Waypoint).apply(this, arguments));
  }

  _createClass(Waypoint, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      if (this.props.scrollableParent) {
        // eslint-disable-line react/prop-types
        throw new Error('The `scrollableParent` prop has changed name ' + 'to `scrollableAncestor`.');
      }
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      if (!Waypoint.getWindow()) {
        return;
      }
      this._handleScroll = this.props.throttleHandler(this._handleScroll.bind(this));
      this.scrollableAncestor = this._findScrollableAncestor();
      if (this.props.debug) {
        debugLog('scrollableAncestor', this.scrollableAncestor);
      }
      this.scrollableAncestor.addEventListener('scroll', this._handleScroll);
      window.addEventListener('resize', this._handleScroll);
      this._handleScroll(null);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      if (!Waypoint.getWindow()) {
        return;
      }

      // The element may have moved.
      this._handleScroll(null);
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      if (!Waypoint.getWindow()) {
        return;
      }

      if (this.scrollableAncestor) {
        // At the time of unmounting, the scrollable ancestor might no longer
        // exist. Guarding against this prevents the following error:
        //
        //   Cannot read property 'removeEventListener' of undefined
        this.scrollableAncestor.removeEventListener('scroll', this._handleScroll);
      }
      window.removeEventListener('resize', this._handleScroll);
    }

    /**
     * Traverses up the DOM to find an ancestor container which has an overflow
     * style that allows for scrolling.
     *
     * @return {Object} the closest ancestor element with an overflow style that
     *   allows for scrolling. If none is found, the `window` object is returned
     *   as a fallback.
     */

  }, {
    key: '_findScrollableAncestor',
    value: function _findScrollableAncestor() {
      if (this.props.scrollableAncestor) {
        return this.props.scrollableAncestor;
      }

      var node = _react2.default.findDOMNode(this);

      while (node.parentNode) {
        node = node.parentNode;

        if (node === document) {
          // This particular node does not have a computed style.
          continue;
        }

        if (node === document.documentElement) {
          // This particular node does not have a scroll bar, it uses the window.
          continue;
        }

        var style = window.getComputedStyle(node);
        var overflowY = style.getPropertyValue('overflow-y') || style.getPropertyValue('overflow');

        if (overflowY === 'auto' || overflowY === 'scroll') {
          return node;
        }
      }

      // A scrollable ancestor element was not found, which means that we need to
      // do stuff on window.
      return window;
    }

    /**
     * @param {Object} event the native scroll event coming from the scrollable
     *   ancestor, or resize event coming from the window. Will be undefined if
     *   called by a React lifecyle method
     */

  }, {
    key: '_handleScroll',
    value: function _handleScroll(event) {
      var currentPosition = this._currentPosition();
      var previousPosition = this._previousPosition || null;
      if (this.props.debug) {
        debugLog('currentPosition', currentPosition);
        debugLog('previousPosition', previousPosition);
      }

      // Save previous position as early as possible to prevent cycles
      this._previousPosition = currentPosition;

      if (previousPosition === currentPosition) {
        // No change since last trigger
        return;
      }

      var callbackArg = {
        currentPosition: currentPosition,
        previousPosition: previousPosition,
        event: event
      };
      this.props.onPositionChange.call(this, callbackArg);

      if (currentPosition === POSITIONS.inside) {
        this.props.onEnter.call(this, callbackArg);
      } else if (previousPosition === POSITIONS.inside) {
        this.props.onLeave.call(this, callbackArg);
      }

      var isRapidScrollDown = previousPosition === POSITIONS.below && currentPosition === POSITIONS.above;
      var isRapidScrollUp = previousPosition === POSITIONS.above && currentPosition === POSITIONS.below;
      if (this.props.fireOnRapidScroll && (isRapidScrollDown || isRapidScrollUp)) {
        // If the scroll event isn't fired often enough to occur while the
        // waypoint was visible, we trigger both callbacks anyway.
        this.props.onEnter.call(this, {
          currentPosition: POSITIONS.inside,
          previousPosition: previousPosition,
          event: event
        });
        this.props.onLeave.call(this, {
          currentPosition: currentPosition,
          previousPosition: POSITIONS.inside,
          event: event
        });
      }
    }

    /**
     * @return {string} The current position of the waypoint in relation to the
     *   visible portion of the scrollable parent. One of `POSITIONS.above`,
     *   `POSITIONS.below`, or `POSITIONS.inside`.
     */

  }, {
    key: '_currentPosition',
    value: function _currentPosition() {
      var waypointTop = _react2.default.findDOMNode(this).getBoundingClientRect().top;
      var contextHeight = void 0;
      var contextScrollTop = void 0;
      if (this.scrollableAncestor === window) {
        contextHeight = window.innerHeight;
        contextScrollTop = 0;
      } else {
        contextHeight = this.scrollableAncestor.offsetHeight;
        contextScrollTop = _react2.default.findDOMNode(this.scrollableAncestor).getBoundingClientRect().top;
      }
      if (this.props.debug) {
        debugLog('waypoint top', waypointTop);
        debugLog('scrollableAncestor height', contextHeight);
        debugLog('scrollableAncestor scrollTop', contextScrollTop);
      }
      var thresholdPx = contextHeight * this.props.threshold;
      var contextBottom = contextScrollTop + contextHeight;

      if (contextHeight === 0) {
        return Waypoint.invisible;
      }

      if (contextScrollTop <= waypointTop + thresholdPx && waypointTop - thresholdPx <= contextBottom) {
        return Waypoint.inside;
      }

      if (contextBottom < waypointTop - thresholdPx) {
        return Waypoint.below;
      }

      if (waypointTop + thresholdPx < contextScrollTop) {
        return Waypoint.above;
      }

      return Waypoint.invisible;
    }

    /**
     * @return {Object}
     */

  }, {
    key: 'render',
    value: function render() {
      // We need an element that we can locate in the DOM to determine where it is
      // rendered relative to the top of its context.
      return _react2.default.createElement('span', { style: { fontSize: 0 } });
    }
  }]);

  return Waypoint;
}(_react2.default.Component);

exports.default = Waypoint;


Waypoint.propTypes = propTypes;
Waypoint.above = POSITIONS.above;
Waypoint.below = POSITIONS.below;
Waypoint.inside = POSITIONS.inside;
Waypoint.invisible = POSITIONS.invisible;
Waypoint.getWindow = function () {
  if (typeof window !== 'undefined') {
    return window;
  }
};
Waypoint.defaultProps = defaultProps;
Waypoint.displayName = 'Waypoint';
module.exports = exports['default'];
