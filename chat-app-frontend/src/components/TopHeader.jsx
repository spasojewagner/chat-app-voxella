import React from 'react'

const TopHeader = () => {
  return (
    <div
      className="
        bg-base-200
        gap-5
        mb-3
        flex
        items-center
        justify-center
        p-1
        /* Box-shadow koji daje žuti sjaj na donjoj ivici */
        shadow-lg
      "
    >
      <h1 className="tracking-[0.3em] text-accent font-bold text-3xl">
        VoxElla
      </h1>
      <p className="font-semibold  text-pretty text-sm ml-4">
        Messaging Made Simple, Connections Made Stronger!
      </p>
    </div>
  )
}

export default TopHeader
