describe('Chart.helpers.config', function() {
  const {getHoverColor, _createResolver, _attachContext} = Chart.helpers;

  describe('_createResolver', function() {
    it('should resolve to raw values', function() {
      const defaults = {
        color: 'red',
        backgroundColor: 'green',
        hoverColor: (ctx, options) => getHoverColor(options.color)
      };
      const options = {
        color: 'blue'
      };
      const resolver = _createResolver([options, defaults]);
      expect(resolver.color).toEqual('blue');
      expect(resolver.backgroundColor).toEqual('green');
      expect(resolver.hoverColor).toEqual(defaults.hoverColor);
    });

    it('should resolve to parent scopes', function() {
      const defaults = {
        root: true,
        sub: {
          child: true
        }
      };
      const options = {
        child: 'sub default comes before this',
        opt: 'opt'
      };
      const resolver = _createResolver([options, defaults]);
      const sub = resolver.sub;
      expect(sub.root).toEqual(true);
      expect(sub.child).toEqual(true);
      expect(sub.opt).toEqual('opt');
    });

    it('should support overriding options', function() {
      const defaults = {
        option1: 'defaults1',
        option2: 'defaults2',
        option3: 'defaults3',
      };
      const options = {
        option1: 'options1',
        option2: 'options2'
      };
      const overrides = {
        option1: 'override1'
      };
      const resolver = _createResolver([options, defaults]);
      expect(resolver).toEqualOptions({
        option1: 'options1',
        option2: 'options2',
        option3: 'defaults3'
      });
      expect(resolver.override(overrides)).toEqualOptions({
        option1: 'override1',
        option2: 'options2',
        option3: 'defaults3'
      });
    });

    it('should support common object methods', function() {
      const defaults = {
        option1: 'defaults'
      };
      class Options {
        constructor() {
          this.option2 = 'options';
        }
        get getter() {
          return 'options getter';
        }
      }
      const options = new Options();

      const resolver = _createResolver([options, defaults]);

      expect(Object.prototype.hasOwnProperty.call(resolver, 'option2')).toBeTrue();

      expect(Object.prototype.hasOwnProperty.call(resolver, 'option1')).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(resolver, 'getter')).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(resolver, 'nonexistent')).toBeFalse();

      expect(Object.keys(resolver)).toEqual(['option2']);
      expect(Object.getOwnPropertyNames(resolver)).toEqual(['option2', 'option1']);

      expect('option2' in resolver).toBeTrue();
      expect('option1' in resolver).toBeTrue();
      expect('getter' in resolver).toBeFalse();
      expect('nonexistent' in resolver).toBeFalse();

      expect(resolver instanceof Options).toBeTrue();

      expect(resolver.getter).toEqual('options getter');
    });

    describe('_fallback', function() {
      it('should follow simple _fallback', function() {
        const defaults = {
          interaction: {
            mode: 'test',
            priority: 'fall'
          },
          hover: {
            _fallback: 'interaction',
            priority: 'main'
          }
        };
        const options = {
          interaction: {
            a: 1
          },
          hover: {
            b: 2
          }
        };
        const resolver = _createResolver([options, defaults]);
        expect(resolver.hover).toEqualOptions({
          mode: 'test',
          priority: 'main',
          a: 1,
          b: 2
        });
      });

      it('should not fallback when _fallback is false', function() {
        const defaults = {
          hover: {
            _fallback: false,
            a: 'defaults.hover'
          },
          controllers: {
            y: 'defaults.controllers',
            bar: {
              z: 'defaults.controllers.bar',
              hover: {
                b: 'defaults.controllers.bar.hover'
              }
            }
          },
          x: 'defaults root'
        };
        const options = {
          x: 'options',
          hover: {
            c: 'options.hover',
            sub: {
              f: 'options.hover.sub'
            }
          },
          controllers: {
            y: 'options.controllers',
            bar: {
              z: 'options.controllers.bar',
              hover: {
                d: 'options.controllers.bar.hover',
                sub: {
                  e: 'options.controllers.bar.hover.sub'
                }
              }
            }
          }
        };
        const resolver = _createResolver([options, options.controllers.bar, options.controllers, defaults.controllers.bar, defaults.controllers, defaults]);
        expect(resolver.hover).toEqualOptions({
          a: 'defaults.hover',
          b: 'defaults.controllers.bar.hover',
          c: 'options.hover',
          d: 'options.controllers.bar.hover',
          e: undefined,
          f: undefined,
          x: undefined,
          y: undefined,
          z: undefined
        });
        expect(resolver.hover.sub).toEqualOptions({
          a: undefined,
          b: undefined,
          c: undefined,
          d: undefined,
          e: 'options.controllers.bar.hover.sub',
          f: 'options.hover.sub',
          x: undefined,
          y: undefined,
          z: undefined
        });
      });

      it('should fallback to specific scope', function() {
        const defaults = {
          hover: {
            _fallback: 'hover',
            a: 'defaults.hover'
          },
          controllers: {
            y: 'defaults.controllers',
            bar: {
              z: 'defaults.controllers.bar',
              hover: {
                b: 'defaults.controllers.bar.hover'
              }
            }
          },
          x: 'defaults root'
        };
        const options = {
          x: 'options',
          hover: {
            c: 'options.hover',
            sub: {
              f: 'options.hover.sub'
            }
          },
          controllers: {
            y: 'options.controllers',
            bar: {
              z: 'options.controllers.bar',
              hover: {
                d: 'options.controllers.bar.hover',
                sub: {
                  e: 'options.controllers.bar.hover.sub'
                }
              }
            }
          }
        };
        const resolver = _createResolver([options, options.controllers.bar, options.controllers, defaults.controllers.bar, defaults.controllers, defaults]);
        expect(resolver.hover).toEqualOptions({
          a: 'defaults.hover',
          b: 'defaults.controllers.bar.hover',
          c: 'options.hover',
          d: 'options.controllers.bar.hover',
          e: undefined,
          f: undefined,
          x: undefined,
          y: undefined,
          z: undefined
        });
        expect(resolver.hover.sub).toEqualOptions({
          a: 'defaults.hover',
          b: 'defaults.controllers.bar.hover',
          c: 'options.hover',
          d: 'options.controllers.bar.hover',
          e: 'options.controllers.bar.hover.sub',
          f: 'options.hover.sub',
          x: undefined,
          y: undefined,
          z: undefined
        });
      });

      it('should fallback throuhg multiple routes', function() {
        const defaults = {
          root: {
            a: 'root'
          },
          level1: {
            _fallback: 'root',
            b: 'level1',
          },
          level2: {
            _fallback: 'level1',
            level1: {
              g: 'level2.level1'
            },
            c: 'level2',
            sublevel1: {
              d: 'sublevel1'
            },
            sublevel2: {
              e: 'sublevel2',
              level1: {
                f: 'sublevel2.level1'
              }
            }
          }
        };
        const resolver = _createResolver([defaults]);
        expect(resolver.level1).toEqualOptions({
          a: 'root',
          b: 'level1',
          c: undefined
        });
        expect(resolver.level2).toEqualOptions({
          a: 'root',
          b: 'level1',
          c: 'level2',
          d: undefined
        });
        expect(resolver.level2.sublevel1).toEqualOptions({
          a: 'root',
          b: 'level1',
          c: 'level2', // TODO: this should be undefined
          d: 'sublevel1',
          e: undefined,
          f: undefined,
          g: 'level2.level1'
        });
        expect(resolver.level2.sublevel2).toEqualOptions({
          a: 'root',
          b: 'level1',
          c: 'level2', // TODO: this should be undefined
          d: undefined,
          e: 'sublevel2',
          f: undefined,
          g: 'level2.level1'
        });
        expect(resolver.level2.sublevel2.level1).toEqualOptions({
          a: 'root',
          b: 'level1',
          c: 'level2', // TODO: this should be undefined
          d: undefined,
          e: 'sublevel2', // TODO: this should be undefined
          f: 'sublevel2.level1',
          g: 'level2.level1'
        });
      });
    });
  });

  describe('_attachContext', function() {
    it('should resolve to final values', function() {
      const defaults = {
        color: 'red',
        backgroundColor: 'green',
        hoverColor: (ctx, options) => getHoverColor(options.color)
      };
      const options = {
        color: ['white', 'blue']
      };
      const resolver = _createResolver([options, defaults]);
      const opts = _attachContext(resolver, {index: 1});
      expect(opts.color).toEqual('blue');
      expect(opts.backgroundColor).toEqual('green');
      expect(opts.hoverColor).toEqual(getHoverColor('blue'));
    });

    it('should thrown on recursion', function() {
      const options = {
        foo: (ctx, opts) => opts.bar,
        bar: (ctx, opts) => opts.xyz,
        xyz: (ctx, opts) => opts.foo
      };
      const resolver = _createResolver([options]);
      const opts = _attachContext(resolver, {test: true});
      expect(function() {
        return opts.foo;
      }).toThrowError('Recursion detected: foo->bar->xyz->foo');
    });

    it('should support scriptable options in subscopes', function() {
      const defaults = {
        elements: {
          point: {
            backgroundColor: 'red'
          }
        }
      };
      const options = {
        elements: {
          point: {
            borderColor: (ctx, opts) => getHoverColor(opts.backgroundColor)
          }
        }
      };
      const resolver = _createResolver([options, defaults]);
      const opts = _attachContext(resolver, {});
      expect(opts.elements.point.borderColor).toEqual(getHoverColor('red'));
      expect(opts.elements.point.backgroundColor).toEqual('red');
    });

    it('same resolver should be usable with multiple contexts', function() {
      const defaults = {
        animation: {
          delay: 10
        }
      };
      const options = {
        animation: (ctx) => ctx.index === 0 ? {duration: 1000} : {duration: 500}
      };
      const resolver = _createResolver([options, defaults]);
      const opts1 = _attachContext(resolver, {index: 0});
      const opts2 = _attachContext(resolver, {index: 1});

      expect(opts1.animation.duration).toEqual(1000);
      expect(opts1.animation.delay).toEqual(10);

      expect(opts2.animation.duration).toEqual(500);
      expect(opts2.animation.delay).toEqual(10);
    });

    it('should fall back from object returned from scriptable option', function() {
      const defaults = {
        mainScope: {
          main: true,
          subScope: {
            sub: true
          }
        }
      };
      const options = {
        mainScope: (ctx) => ({
          mainTest: ctx.contextValue,
          subScope: {
            subText: 'a'
          }
        })
      };
      const opts = _attachContext(_createResolver([options, defaults]), {contextValue: 'test'});
      expect(opts.mainScope).toEqualOptions({
        main: true,
        mainTest: 'test',
        subScope: {
          sub: true,
          subText: 'a'
        }
      });
    });

    it('should resolve array of non-indexable objects properly', function() {
      const defaults = {
        label: {
          value: 42,
          text: (ctx) => ctx.text
        },
        labels: {
          _fallback: 'label',
          _indexable: false
        }
      };

      const options = {
        labels: [{text: 'a'}, {text: 'b'}, {value: 1}]
      };
      const opts = _attachContext(_createResolver([options, defaults]), {text: 'context'});
      expect(opts).toEqualOptions({
        labels: [
          {
            text: 'a',
            value: 42
          },
          {
            text: 'b',
            value: 42
          },
          {
            text: 'context',
            value: 1
          }
        ]
      });
    });

    it('should support overriding options', function() {
      const options = {
        fn1: ctx => ctx.index,
        fn2: ctx => ctx.type
      };
      const override = {
        fn1: ctx => ctx.index * 2
      };
      const opts = _attachContext(_createResolver([options]), {index: 2, type: 'test'});
      expect(opts).toEqualOptions({
        fn1: 2,
        fn2: 'test'
      });
      expect(opts.override(override)).toEqualOptions({
        fn1: 4,
        fn2: 'test'
      });
    });

    it('should support changing context', function() {
      const opts = _attachContext(_createResolver([{fn: ctx => ctx.test}]), {test: 1});
      expect(opts.fn).toEqual(1);
      expect(opts.setContext({test: 2}).fn).toEqual(2);
      expect(opts.fn).toEqual(1);
    });

    it('should support common object methods', function() {
      const defaults = {
        option1: 'defaults'
      };
      class Options {
        constructor() {
          this.option2 = () => 'options';
        }
        get getter() {
          return 'options getter';
        }
      }
      const options = new Options();
      const resolver = _createResolver([options, defaults]);
      const opts = _attachContext(resolver, {index: 1});

      expect(Object.prototype.hasOwnProperty.call(opts, 'option2')).toBeTrue();

      expect(Object.prototype.hasOwnProperty.call(opts, 'option1')).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(opts, 'getter')).toBeFalse();
      expect(Object.prototype.hasOwnProperty.call(opts, 'nonexistent')).toBeFalse();

      expect(Object.keys(opts)).toEqual(['option2']);
      expect(Object.getOwnPropertyNames(opts)).toEqual(['option2', 'option1']);

      expect('option2' in opts).toBeTrue();
      expect('option1' in opts).toBeTrue();
      expect('getter' in opts).toBeFalse();
      expect('nonexistent' in opts).toBeFalse();

      expect(opts instanceof Options).toBeTrue();

      expect(opts.getter).toEqual('options getter');
    });

    describe('_indexable and _scriptable', function() {
      it('should default to true', function() {
        const options = {
          array: [1, 2, 3],
          func: (ctx) => ctx.index * 10
        };
        const opts = _attachContext(_createResolver([options]), {index: 1});
        expect(opts.array).toEqual(2);
        expect(opts.func).toEqual(10);
      });

      it('should allow false', function() {
        const fn = () => 'test';
        const options = {
          _indexable: false,
          _scriptable: false,
          array: [1, 2, 3],
          func: fn
        };
        const opts = _attachContext(_createResolver([options]), {index: 1});
        expect(opts.array).toEqual([1, 2, 3]);
        expect(opts.func).toEqual(fn);
        expect(opts.func()).toEqual('test');
      });

      it('should allow function', function() {
        const fn = () => 'test';
        const options = {
          _indexable: (prop) => prop !== 'array',
          _scriptable: (prop) => prop === 'func',
          array: [1, 2, 3],
          array2: ['a', 'b', 'c'],
          func: fn
        };
        const opts = _attachContext(_createResolver([options]), {index: 1});
        expect(opts.array).toEqual([1, 2, 3]);
        expect(opts.func).toEqual('test');
        expect(opts.array2).toEqual('b');
      });
    });
  });
});