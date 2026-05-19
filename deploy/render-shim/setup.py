from setuptools import setup

setup(
    name="inspectra-render-shim",
    version="0.0.1",
    py_modules=["inspectra_gunicorn_shim"],
    entry_points={
        "console_scripts": [
            "gunicorn=inspectra_gunicorn_shim:main",
        ],
    },
)
