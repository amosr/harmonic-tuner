export function Options() {
  return (
    <section className="section">
    <div className="container">
      <div className="field">
        <div className="control">
          <input className="input" type="text" placeholder="frequency (hz)" />
        </div>
      </div>
      <div className="field">
          <p>harmonics</p>
          <div className="checkboxes">
          <label className="checkbox">
            <input type="checkbox" value={1} /> 1
          </label>
          <label className="checkbox">
            <input type="checkbox" value={2}/> 2
          </label>
          <label className="checkbox">
            <input type="checkbox" value={3}/> 3
          </label>
          <label className="checkbox">
            <input type="checkbox" value={4} /> 4
          </label>
          </div>
      </div>

    </div>
  </section>
  );
}
